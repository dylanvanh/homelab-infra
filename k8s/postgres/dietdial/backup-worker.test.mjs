import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { Miniflare, Request, convertV4MiniflareOptions } from "miniflare";

const key = "dietdial/20261023T020000Z.dump";
const checksum = (body) => createHash("sha256").update(body).digest("hex");

function request(body = "backup", headers = {}, path = key, method = "PUT") {
  return new Request(`https://backup.example/${path}`, {
    method,
    body: method === "PUT" ? body : undefined,
    headers: {
      Authorization: "Bearer test-only",
      "X-Content-SHA256": checksum(body),
      ...headers,
    },
  });
}

function runtime(t, token = "test-only") {
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true,
    scriptPath: fileURLToPath(new URL("backup-worker.js", import.meta.url)),
    compatibilityDate: "2026-10-14",
    bindings: { BACKUP_TOKEN: token },
    r2Buckets: ["BACKUPS"],
  }));
  t.after(() => mf.dispose());
  return mf;
}

test("requires authentication and denies read and delete access", async (t) => {
  const mf = runtime(t);
  for (const token of ["", "wrong"])
    assert.equal((await mf.dispatchFetch(request("backup", { Authorization: token }))).status, 401);
  for (const method of ["GET", "HEAD", "DELETE"])
    assert.equal((await mf.dispatchFetch(request("backup", {}, key, method))).status, 405);
  assert.equal((await runtime(t, "").dispatchFetch(request())).status, 401);
});

test("rejects invalid names, empty bodies, and checksums without writing", async (t) => {
  const mf = runtime(t);
  assert.equal((await mf.dispatchFetch(request("backup", {}, "outside.dump"))).status, 400);
  assert.equal((await mf.dispatchFetch(request(""))).status, 413);
  for (const hash of ["invalid", "0".repeat(64)])
    assert.equal((await mf.dispatchFetch(request("backup", { "X-Content-SHA256": hash }))).status, 400);
  assert.equal(await (await mf.getR2Bucket("BACKUPS")).head(key), null);
});

test("creates once, accepts identical retries, and refuses replacement", async (t) => {
  const mf = runtime(t);
  const first = await mf.dispatchFetch(request());
  assert.equal(first.status, 200);
  assert.equal((await first.json()).size, 6);
  assert.equal((await mf.dispatchFetch(request())).status, 200);
  assert.equal((await mf.dispatchFetch(request("attack"))).status, 409);
  const object = await (await mf.getR2Bucket("BACKUPS")).get(key);
  assert.equal(await object.text(), "backup");
});

test("concurrent uploads cannot replace the first stored archive", async (t) => {
  const mf = runtime(t);
  const replies = await Promise.all(["first", "second"].map((body) => mf.dispatchFetch(request(body))));
  assert.deepEqual(replies.map((reply) => reply.status).sort(), [200, 409]);
});

test("refuses replacement of legacy objects without checksum metadata", async (t) => {
  const mf = runtime(t);
  const bucket = await mf.getR2Bucket("BACKUPS");
  await bucket.put(key, "legacy");
  assert.equal((await mf.dispatchFetch(request())).status, 409);
  assert.equal(await (await bucket.get(key)).text(), "legacy");
});

test("rejects uploads above the 96 MiB limit", async (t) => {
  const mf = runtime(t);
  const response = await mf.dispatchFetch(request("x".repeat(96 * 1024 * 1024 + 1)));
  assert.equal(response.status, 413);
  assert.equal(await (await mf.getR2Bucket("BACKUPS")).head(key), null);
});

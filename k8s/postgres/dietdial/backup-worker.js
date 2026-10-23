const MAX_BYTES = 96 * 1024 * 1024;
const KEY_PATTERN = /^dietdial\/\d{8}T\d{6}Z\.(dump|manifest\.json)$/;

async function authenticated(request, token) {
  if (!token) return false;
  const encoder = new TextEncoder();
  const hashes = await Promise.all([
    request.headers.get("Authorization") ?? "",
    `Bearer ${token}`,
  ].map(value => crypto.subtle.digest("SHA-256", encoder.encode(value))));
  return crypto.subtle.timingSafeEqual(...hashes);
}

export default {
  async fetch(request, env) {
    if (!await authenticated(request, env.BACKUP_TOKEN)) {
      return new Response("Unauthorized", { status: 401 });
    }
    if (request.method !== "PUT") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "PUT" } });
    }

    const key = new URL(request.url).pathname.slice(1);
    if (!KEY_PATTERN.test(key)) return new Response("Invalid backup key", { status: 400 });
    const length = Number(request.headers.get("Content-Length"));
    if (!Number.isSafeInteger(length) || length <= 0 || length > MAX_BYTES || !request.body) {
      return new Response("Invalid backup size", { status: 413 });
    }
    const checksum = request.headers.get("X-Content-SHA256");
    if (!/^[a-f0-9]{64}$/.test(checksum ?? "")) {
      return new Response("SHA-256 checksum required", { status: 400 });
    }

    // R2 requires a known stream length; this also enforces the declared limit.
    const stream = new FixedLengthStream(length);
    const abort = new AbortController();
    const transfer = request.body.pipeTo(stream.writable, { signal: abort.signal })
      .then(() => null, error => error);
    try {
      let object = await env.BACKUPS.put(key, stream.readable, {
        onlyIf: { etagDoesNotMatch: "*" },
        sha256: checksum,
        customMetadata: { sha256: checksum },
        httpMetadata: { contentType: key.endsWith(".json") ? "application/json" : "application/octet-stream" },
      });
      if (!object) {
        abort.abort();
        object = await env.BACKUPS.head(key);
        // A lost response can cause an identical upload to be retried.
        if (!object || object.size !== length || object.customMetadata?.sha256 !== checksum) {
          return new Response("Backup already exists", { status: 409 });
        }
      } else if (await transfer) {
        return new Response("Backup upload failed", { status: 400 });
      }
      return Response.json({ key, size: object.size, etag: object.etag });
    } catch {
      return new Response("Backup upload failed", { status: 400 });
    } finally {
      abort.abort();
      await transfer;
    }
  },
};

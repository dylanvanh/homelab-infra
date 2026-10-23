# DietDial PostgreSQL operations

DietDial uses database and role `dietdial` on the shared PostgreSQL cluster.
Cloudflare Access permits the dedicated service token. The Tunnel sends TCP to
`postgres-rw.default.svc.cluster.local:5432`. Postgres services use ClusterIP.

## Configuration and credentials

- `tunnel.yaml` and `tunnel-config.json`: Tunnel connectors and route.
- `cloudflare-resources.json.example`: template for a private resource inventory.
  Copy it to `cloudflare-resources.local.json`, which Git ignores.
- `backup-cronjob.yaml`: daily dump and upload to private R2 storage.
- `backup-worker.js` and `wrangler.json`: backup upload service.
- `server-ca.crt`: public CA certificate; its private key must stay outside Git.
- `secret.yaml.example`: placeholders; fill a private `secret.yaml` before use.

Use Wrangler profile `personal` with the account in `wrangler.json`. Keep recovery
credentials in a private directory outside this repository, with directory mode
`0700` and file mode `0600`. Do not place database archives or credentials in PRs.

Restore the existing CA before applying the parent `cluster.yaml`. The Secret
`postgres-server-ca` needs `ca.crt`, `ca.key`, and label `cnpg.io/reload: "true"`.
Do not replace the CA without updating Hyperdrive and every TLS client.
CloudNativePG issues the server certificates. Client and replication certificates
use the operator-managed CA.

The database role needs NOSUPERUSER, NOCREATEDB, NOCREATEROLE, and NOREPLICATION.
Use a private environment or stdin for its password. Create database `dietdial`
with owner `dietdial`, template `template0`, encoding UTF8, `LOCALE_PROVIDER builtin`,
and `BUILTIN_LOCALE 'C.UTF-8'`. Revoke CONNECT from PUBLIC. Restore a custom archive
with `--no-owner --no-acl` as `dietdial` only after approval for the target database.

Restore the Tunnel and backup tokens into the Secrets in `secret.yaml.example`.
The Worker requires the matching `BACKUP_TOKEN` secret and the existing R2 bucket.
Do not pass token values as command arguments or log request headers.

## Backup service

The CronJob runs at 02:00 UTC. It uploads a custom PostgreSQL archive and a JSON
manifest with the archive SHA-256. Each upload must provide its own SHA-256 header.
The Worker accepts authenticated PUT requests only, up to 96 MiB per object.
An atomic condition prevents overwrite. An identical retry succeeds; a different
body at the same key is refused. Existing objects without checksum metadata also
cannot be replaced. Download requires separate Cloudflare account access.

The uploader token cannot read or delete backups. It is not a retention lock:
Cloudflare account access and bucket lifecycle rules can still delete objects.
The configured 30-day retention and external failure alerts need separate checks.

From this directory:

```sh
npm ci --ignore-scripts
npm test
npm run deploy -- --dry-run
```

For deployment, apply `backup-cronjob.yaml` first so the uploader sends checksums.
Then run `npm run deploy`. Retain the existing Worker secret and bucket. Check a
new backup job after deployment; a dry run does not test the deployed service.

```sh
kubectl create job dietdial-backup-check --from=cronjob/dietdial-database-backup
kubectl wait --for=condition=complete job/dietdial-backup-check --timeout=1200s
kubectl logs job/dietdial-backup-check -c upload
```

Use a new Job name for each run. Download both objects with separate account
access into a private directory outside Git. Set `RECOVERY_DIR` and `BACKUP_STAMP`
to the chosen directory and archive timestamp first:

```sh
umask 077
npx wrangler r2 object get "dietdial-db-backups/dietdial/${BACKUP_STAMP}.dump" --remote --file "${RECOVERY_DIR}/database.dump" --profile personal
npx wrangler r2 object get "dietdial-db-backups/dietdial/${BACKUP_STAMP}.manifest.json" --remote --file "${RECOVERY_DIR}/manifest.json" --profile personal
```

Verify the archive hash against the manifest before restore. Use PostgreSQL 18 or
later tools and an isolated database for recovery tests. Before a production
rollback, stop writes and preserve changes made since the selected backup.
Track token expiry and CA renewal in the private resource inventory.

# DietDial database

DietDial uses the shared PostgreSQL cluster through Cloudflare Access and Tunnel.
`tunnel.yaml` and `tunnel-config.json` hold the connector and route configuration.
Create the Secrets from `secret.yaml.example` using private values outside Git.

Restore the existing `postgres-server-ca` Secret before applying the cluster.
It needs `ca.crt`, `ca.key`, and label `cnpg.io/reload: "true"`. The checked-in
`server-ca.crt` is public. Keep its private key outside Git. A CA change requires
updates to Hyperdrive and every TLS client.

The daily backup runs at 02:00 UTC. The Worker permits authenticated uploads up
to 96 MiB with SHA-256 verification. It prevents replacement of existing objects
and permits identical retries. Download requires separate account access.
The Worker needs its existing `BACKUP_TOKEN` secret and R2 bucket.

Apply `backup-cronjob.yaml` before deploying the Worker so uploads send checksums:

```sh
kubectl apply -f backup-cronjob.yaml
npx wrangler@4.152.0 deploy --profile personal
kubectl create job dietdial-backup-check --from=cronjob/dietdial-database-backup
kubectl logs -f job/dietdial-backup-check -c upload
```

Use a new Job name for each check. Keep downloaded archives outside Git and
verify the manifest SHA-256 before restore. Use PostgreSQL 18 or later tools.
Restore into an isolated database first. Before a production rollback, stop writes
and preserve changes made since the chosen backup.

For a fresh database, use owner `dietdial`, template `template0`, UTF8 encoding,
`LOCALE_PROVIDER builtin`, and `BUILTIN_LOCALE 'C.UTF-8'`. The role needs
NOSUPERUSER, NOCREATEDB, NOCREATEROLE, and NOREPLICATION. Revoke CONNECT from PUBLIC
and restore custom archives with `--no-owner --no-acl` as `dietdial`.

# Postgres Setup

Using CloudNativePG 1.29.3 for PostgreSQL 18.6 with automatic failover.
The cluster pins the standard Debian trixie image by digest. This image
includes the configured `en_US.utf8` locale.

Before a major upgrade, save a full backup outside the cluster and test its
restore. Use the same Debian release for the PostgreSQL images before and
after a major version change.

## Install Operator

```bash
kubectl apply --server-side -f \
  https://github.com/cloudnative-pg/cloudnative-pg/releases/download/v1.29.3/cnpg-1.29.3.yaml
```

## Deploy Cluster

```bash
kubectl apply -f secret.yaml
# Restore postgres-server-ca from the private bundle first; see dietdial/README.md.
kubectl apply -f cluster.yaml
```

## Check Status

```bash
kubectl get cluster postgres
kubectl get pods -l cnpg.io/cluster=postgres -L cnpg.io/instanceRole
```

## Connect

### From cluster

```
postgresql://username:password@postgres-rw:5432/investec
```

### DietDial production access

PostgreSQL uses private ClusterIP services. DietDial connects through Cloudflare
Access and its dedicated Tunnel. See [DietDial operations](dietdial/README.md)
for verified TLS, local tools, backups, and certificate renewal.

## Useful Commands

```bash
# logs
kubectl logs -f postgres-1

# psql shell
kubectl exec -it postgres-1 -- psql -U app -d investec

# check replication
kubectl exec -it postgres-1 -- psql -U postgres -c "SELECT * FROM pg_stat_replication;"

# manual failover (for testing)
kubectl delete pod postgres-1
```

- PostgreSQL has no public NodePort.

## Docs

https://cloudnative-pg.io/

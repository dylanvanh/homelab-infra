# Postgres Setup

Using CloudNativePG for HA postgres with automatic failover.

## Install Operator

```bash
kubectl apply --server-side -f \
  https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.24/releases/cnpg-1.24.1.yaml
```

## Deploy Cluster

```bash
kubectl apply -f secret.yaml
kubectl apply -f cluster.yaml
kubectl apply -f service.yaml
```

## Check Status

```bash
kubectl get cluster postgres
kubectl get pods -l cnpg.io/cluster=postgres -L role
```

## Connect

### From cluster

```
postgresql://username:password@postgres:5432/investec
```

### From dev machine (via tailscale)

```
postgresql://username:password@ip:30432/investec
```

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

- Exposed on NodePort 30432

## Docs

https://cloudnative-pg.io/

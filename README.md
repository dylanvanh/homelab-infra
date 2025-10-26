# homelab-infra

Infrastructure configuration for running services on Raspberry Pi cluster.

## Versions

- **v1 (docker-compose branch):** Docker Compose setup
- **v2** Kubernetes (k3s) setup

## Kubernetes Setup

### Prerequisites

For projects requiring secrets, create `secret.yaml` from the example:

```bash
cp k8s/base/<project>/secret.yaml.example k8s/base/<project>/secret.yaml
```

### Deploy a Service

```bash
kubectl apply -f k8s/base/<project>/
```

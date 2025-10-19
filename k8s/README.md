# Kubernetes Setup

This directory contains Kubernetes manifests to replicate the Docker Compose setup.

## Directory Structure

- `base/` - Base Kubernetes resources for all applications
  - `sats-kit/` - Sats-Kit server and client deployments
  - `pixelpythons/` - Pixel Pythons deployment
  - `ingress.yaml` - Main ingress resource (replaces Nginx)

## Prerequisites

- K3d for local testing: `brew install k3d`
- kubectl: `brew install kubectl`

## Getting Started

### 1. Create a K3d Cluster

```bash
k3d cluster create pi-cluster \
  --port 8080:80@loadbalancer \
  --port 8443:443@loadbalancer
```

This creates a cluster with port forwarding so you can access services locally.

### 2. Build and Import Docker Images

Build your images:

```bash
cd ../sats-kit/server && docker build -t sats-kit-server:latest .
cd ../sats-kit/client && docker build -t sats-kit-client:latest .
cd ../pixel-pythons && docker build -t pixel-pythons:latest .
```

Import them into K3d:

```bash
k3d image import sats-kit-server:latest -c pi-cluster
k3d image import sats-kit-client:latest -c pi-cluster
k3d image import pixel-pythons:latest -c pi-cluster
```

### 3. Apply the Manifests

```bash
kubectl apply -f k8s/base/
```

### 4. Verify Deployment

Check deployments:

```bash
kubectl get deployments
kubectl get pods
kubectl get services
kubectl get ingress
```

View logs:

```bash
kubectl logs -f deployment/sats-kit-client
kubectl logs -f deployment/pixel-pythons
```

### 5. Test Locally

You can test the services using port-forward:

```bash
kubectl port-forward service/sats-kit-client 8080:80
kubectl port-forward service/pixel-pythons 8081:3001
```

Then visit:

- http://localhost:8080 (sats-kit)
- http://localhost:8081 (pixel-pythons)

## Scaling to Multi-Node

To scale deployments across multiple nodes:

```bash
kubectl scale deployment pixel-pythons --replicas=3
kubectl scale deployment sats-kit-client --replicas=2
```

## Useful Commands

```bash
kubectl get all
kubectl describe pod <pod-name>
kubectl logs <pod-name>
kubectl exec -it <pod-name> -- /bin/sh
kubectl delete -f k8s/base/
k3d cluster delete pi-cluster
```

## Architecture

### Single Node (Current)

```
Cloudflare Tunnel → Traefik Ingress → Services → Pods
```

### Multi-Node (Future)

```
Cloudflare Tunnel → Traefik Ingress → Services → Pods (replicated across nodes)
```

The Ingress controller (Traefik) automatically load balances across pod replicas.

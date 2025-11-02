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

Create the GitHub Container Registry secret for image pulls:

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<your-github-username> \
  --docker-password=<your-github-token>
```

### Initial k3s Setup

1. On the **control plane node** (first node):

```bash
curl -sfL https://get.k3s.io | sh -
```

2. On **worker nodes** (additional nodes), join the cluster:

```bash
curl -sfL https://get.k3s.io | K3S_URL=https://<CONTROL_PLANE_IP>:6443 K3S_TOKEN=<TOKEN_FROM_CONTROL_PLANE> sh -
```

Get the token from the control plane node:

```bash
sudo cat /var/lib/rancher/k3s/server/node-token
```

### Tailscale Configuration

To configure k3s to use Tailscale for cluster communication:

1. Get the Tailscale IPv4 address on each node:

```bash
tailscale ip -4
```

2. On the **control plane node** (server):

```bash
sudo SYSTEMD_EDITOR=vim systemctl edit k3s
```

Add the following configuration (replace `<CONTROL_PLANE_TAILSCALE_IP>` with the IP from step 1):

```
[Service]
ExecStart=
ExecStart=/usr/local/bin/k3s server \
    --node-ip=<CONTROL_PLANE_TAILSCALE_IP> \
    --advertise-address=<CONTROL_PLANE_TAILSCALE_IP> \
    --node-external-ip=<CONTROL_PLANE_TAILSCALE_IP>
```

Save and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart k3s
```

3. On each **worker node**:

```bash
sudo SYSTEMD_EDITOR=vim systemctl edit k3s-agent
```

Add the following configuration (replace `<WORKER_TAILSCALE_IP>` with this node's IP and `<CONTROL_PLANE_TAILSCALE_IP>` with the server's IP):

```
[Service]
ExecStart=
ExecStart=/usr/local/bin/k3s agent \
    --node-ip=<WORKER_TAILSCALE_IP> \
    --server https://<CONTROL_PLANE_TAILSCALE_IP>:6443
```

Save and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart k3s-agent
```

4. Update your local kubeconfig to use the Tailscale IP:

```bash
kubectl config set-cluster default --server=https://<CONTROL_PLANE_TAILSCALE_IP>:6443
```

5. Verify the configuration:

```bash
kubectl get nodes -o wide
```

The `INTERNAL-IP` column should show Tailscale IPs (100.x.x.x range).

### Deploy Services

**Deploy a single project:**

```bash
kubectl apply -f k8s/base/<project>/
```

**Deploy all projects at once:**

```bash
# Apply all Kubernetes manifests (excludes helmfile.yaml)
find k8s/base -name "*.yaml" -not -name "helmfile.yaml" -exec kubectl apply -f {} \;
```

## Helmfile (Monitoring Stack) quickstart

The monitoring stack includes:

- **Prometheus** - Metrics collection and storage
- **Grafana** - Visualization and dashboards
- **Alertmanager** - Alert management
- **Prometheus Operator** - Manages Prometheus instances
- **Node Exporter** - Node-level metrics
- **Kube State Metrics** - Kubernetes object metrics

### Install tooling

```bash
# macOS
brew install helm helmfile
```

### Enable diff (recommended)

```bash
# Installs required plugins incl. helm-diff
helmfile init

# Or install diff plugin explicitly
helm plugin install https://github.com/databus23/helm-diff
```

### Apply releases

```bash
helmfile apply
```

The kube-prometheus-stack release uses values from `k8s/base/kube-prometheus-stack/values-helm.yaml`:

- Grafana: ClusterIP, persistence enabled (2Gi), no Ingress
- Prometheus: 30-day retention, 10Gi storage
- Alertmanager: 2Gi storage
- All components use `local-path` storage class

### Access monitoring components

All components are in the `monitoring` namespace and accessed via port-forward:

**Grafana:**

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
# open http://localhost:3000
# Username: admin
# Password: (get below)
```

**Prometheus:**

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
# open http://localhost:9090
```

**Alertmanager:**

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093:9093
# open http://localhost:9093
```

**Get Grafana admin password:**

```bash
kubectl get secret -n monitoring kube-prometheus-stack-grafana -o jsonpath="{.data.admin-password}" | base64 -d && echo
```

Grafana is pre-configured with the Prometheus datasource, so you can start exploring metrics and dashboards immediately.

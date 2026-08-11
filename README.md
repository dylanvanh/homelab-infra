# homelab-infra

Infrastructure configuration for running services on Raspberry Pi cluster.

## Kubernetes Setup

### Prerequisites

**On your dev machine (macOS):**

```bash
brew install helmfile
helmfile init
```

**Setup secrets:**

For projects requiring secrets, create `secret.yaml` from the example:

```bash
cp k8s/<project>/secret.yaml.example k8s/<project>/secret.yaml
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

> **Note on MTU:** The `--flannel-iface=tailscale0` flag is critical. It ensures Kubernetes adjusts packet sizes (MTU 1230) to fit inside the Tailscale tunnel (MTU 1280), preventing packet loss and connectivity issues.

1. Get the Tailscale IPv4 address on each node:

```bash
tailscale ip -4
```

2. On the **control plane node**, create `/etc/rancher/k3s/config.yaml`:

```yaml
node-ip: <CONTROL_PLANE_TAILSCALE_IP>
advertise-address: <CONTROL_PLANE_TAILSCALE_IP>
node-external-ip: <CONTROL_PLANE_TAILSCALE_IP>
flannel-iface: tailscale0
```

3. On each **worker node**, create `/etc/rancher/k3s/config.yaml`:

```yaml
server: https://<CONTROL_PLANE_TAILSCALE_IP>:6443
node-ip: <WORKER_TAILSCALE_IP>
flannel-iface: tailscale0
```

Restart K3s after you change the files:

```bash
# Control plane
sudo systemctl restart k3s

# Workers
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

### Troubleshooting: node `Ready`, app still times out

After a Tailscale outage/key expiry, a worker can return `Ready` while flannel routes are still stale.

```bash
# on control plane
ip route
# if worker PodCIDR route is missing, cross-node pod traffic is broken

sudo kubectl get nodes -o wide
sudo kubectl get endpoints -A -o wide
```

Fix (fastest):

```bash
sudo systemctl restart k3s
```

Optional first try (worker only):

```bash
# on worker
sudo systemctl restart tailscaled
sudo systemctl restart k3s-agent
```

### Deploy Services

**Deploy a single project:**

```bash
kubectl apply -f k8s/<project>/
```

**Deploy all projects at once:**

```bash
# Apply all Kubernetes manifests (excludes helmfile.yaml)
find k8s -name "*.yaml" -not -name "helmfile.yaml" -exec kubectl apply -f {} \;
```

## Helmfile (Monitoring Stack) quickstart

### Apply releases

```bash
helmfile apply
```

The kube-prometheus-stack release uses values from `k8s/kube-prometheus-stack/values-helm.yaml`.

### Access monitoring components

Run the required port-forward in its own terminal:

| Component | Command | URL |
| --- | --- | --- |
| Grafana | `kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80` | http://localhost:3000 |
| Prometheus | `kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090` | http://localhost:9090 |
| Alertmanager | `kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093:9093` | http://localhost:9093 |

The Grafana username is `admin`. Get its password with:

```bash
kubectl get secret -n monitoring kube-prometheus-stack-grafana -o jsonpath="{.data.admin-password}" | base64 -d && echo
```

Grafana is pre-configured with the Prometheus datasource, so you can start exploring metrics and dashboards immediately.

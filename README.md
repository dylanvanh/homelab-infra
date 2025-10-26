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
    --advertise-address=<CONTROL_PLANE_TAILSCALE_IP>
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

### Deploy a Service

```bash
kubectl apply -f k8s/base/<project>/
```

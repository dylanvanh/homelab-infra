# Pi OpenCode API

The public OpenAI-compatible base URL is `https://ai.dylanvh.com/v1`.
Every API request requires the gateway bearer token.

```text
DietDial Worker at menufit.dylanvh.com
  → ai.dylanvh.com/v1 (Cloudflare HTTPS)
  → existing Cloudflare Tunnel → Traefik
  → opencode-api Service → Pi Tailscale address 100.80.241.32:8788
  → systemd socket proxy → gateway at 127.0.0.1:8787
  → OpenCode at 127.0.0.1:4096 → existing Codex OAuth login
```

## Service configuration

- `opencode.service`: OpenCode V1 1.18.31, running as `dylan`. Its configuration
  and Codex login remain in `/home/dylan/.config/opencode` and
  `/home/dylan/.local/share/opencode/auth.json`.
- `opencode-as-openai-api.service`: gateway commit `a0035da`, running as the
  `opencode-api` service account. It exposes `openai/gpt-6-sol-fast` with the fixed
  `low` reasoning variant (`--variant low`). Fast mode sets `serviceTier` to `priority`.
- `opencode-api-proxy.socket` and `opencode-api-proxy.service`: forward the
  Pi's Tailscale port 8788 to the loopback-only gateway.

The gateway and OpenCode are configured to start at boot. The loopback listener
change is not deployed until Pi access is restored; see `LOOPBACK.md`. Kubernetes provides the existing
ingress route and an external Service endpoint; the model services run on the Pi.

`/srv/opencode-api/opencode.json` defines the restricted gateway agent.
V1 requests disable executable tools and allow only OpenCode's internal
`StructuredOutput` formatter when JSON or function output is required.

## Files and credentials

- Units: `/etc/systemd/system/`, copied from this directory.
- Gateway: `/opt/opencode-as-openai-api/releases/<commit>/node_modules/`.
- Current release: `/opt/opencode-as-openai-api/current` symlink.
- Node.js: `/opt/opencode-as-openai-api/node`. The audit found 24.14.1; the
  patch to 24.22.1 still requires Pi SSH access.
- Gateway secret: `/etc/opencode-as-openai-api.env`, owned by root, mode `0600`.
  It contains `OPENCODE_API_TOKEN`.
- Recovery copies: keep them outside Git with directory mode `0700`. They can
  contain login credentials, the environment file, and database state.

The gateway CLI prints its token at startup. Its unit sends stdout to null to
keep the token out of the journal. Process errors still go to the journal.

DietDial uses these API-server settings:

```text
FOOD_ESTIMATION_API_URL=https://ai.dylanvh.com/v1
FOOD_ESTIMATION_MODEL=openai/gpt-6-sol-fast
FOOD_ESTIMATION_API_TOKEN=<same value as OPENCODE_API_TOKEN>
```

The token is a Worker secret on `menumeter-api`, served at
`menufit.dylanvh.com`. Local development stores it in the ignored
`apps/api/.dev.vars` file. Never put it in mobile or browser configuration.

## Operations

Run on the Pi:

```sh
sudo systemctl status opencode opencode-as-openai-api opencode-api-proxy.socket
sudo journalctl -u opencode-as-openai-api --since '10 minutes ago'
sudo systemctl restart opencode-as-openai-api
```

Apply the ingress configuration from the homelab checkout:

```sh
kubectl apply -f k8s/opencode-api/
```

To update the gateway, build and pack its selected commit, install the package
under a new release directory, update `current`, then restart the gateway.
Keep the existing token. Check that `/v1/models` returns 401 without the token
and 200 with it, then send a food estimate through DietDial.

When rotating the gateway token, update the root-owned environment file, the
DietDial Worker secret, and the local server secret together. Restart the gateway.

Before a future OpenCode V2 switch, back up its state and confirm the Codex login
works with V2. Use the gateway's V2 agent configuration and upstream authentication
settings, then restart the gateway so it detects the new API version.

# Pi OpenCode gateway

`https://ai.dylanvh.com/v1` requires the gateway bearer token.

```text
Cloudflare Tunnel → Traefik → Pi Tailscale :8788
→ systemd proxy → gateway 127.0.0.1:8787 → OpenCode 127.0.0.1:4096
```

The units in this directory run the gateway as `opencode-api` and OpenCode as
`dylan`. `opencode.json` defines the restricted gateway agent. Executable tools
are disabled. The model and reasoning setting are in the gateway service unit.

Keep `OPENCODE_API_TOKEN` in `/etc/opencode-as-openai-api.env`, owned by root with
mode `0600`. The matching DietDial setting is `FOOD_ESTIMATION_API_TOKEN`.
The gateway prints its token at startup, so its unit discards stdout.
Keep login files and recovery copies outside Git.

On an existing Pi installation, back up the unit and drop-ins, then install
`opencode.service.d/loopback.conf` under the same systemd directory. Run:

```sh
sudo systemctl daemon-reload
sudo systemctl restart opencode
sudo systemctl status opencode opencode-as-openai-api opencode-api-proxy.socket
```

Check local `/global/health`, both bots, and the gateway. Remote port 4096 must
reject connections. `/v1/models` must return 401 without the token and 200 with it.
Rollback the listener change by removing only the drop-in and restarting OpenCode.

The listener change and gateway Node update still need Pi SSH access.

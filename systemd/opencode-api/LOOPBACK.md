# OpenCode listener restriction

The existing gateway and host-network Discord bots call `127.0.0.1:4096`.
Install `opencode.service.d/loopback.conf` under
`/etc/systemd/system/opencode.service.d/`, reload systemd, and restart OpenCode.
The drop-in preserves the existing service account, environment, and state.
Back up the current unit and drop-ins before applying it.

Verify local `/global/health` succeeds, the gateway still responds, both bots
can reach their upstream, and port 4096 rejects requests from another node.
This protects the raw unauthenticated API from remote callers. Trusted local
processes still have access; this does not add per-client authentication.

Rollback: remove only this drop-in, reload systemd, and restart OpenCode.

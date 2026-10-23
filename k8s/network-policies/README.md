# Public web application egress

Apply `public-web-egress.yaml` to the default namespace. Nuke and Pixel Pythons
can query cluster DNS and use public IPv4 HTTP/HTTPS. Private, link-local,
loopback, and Tailscale destinations are excluded. IPv6 egress is not allowed.
No ingress policy is added; the existing tunnel ingress path remains intact.

The policy requires the cluster network-policy controller. Verify enforcement
from both applications: raw OpenCode at `100.80.241.32:4096` must fail, while
required public APIs and the public application pages must still work.

Host-network bots are not covered. They need loopback access to OpenCode.
Other applications are not selected because their private service dependencies
must be checked before restricting them. NetworkPolicy does not isolate a pod
from its own node; the OpenCode loopback override is a separate host control.

Rollback: delete only the `public-web-egress` NetworkPolicy if a required
connection fails, then correct the allowlist before restoring the policy.

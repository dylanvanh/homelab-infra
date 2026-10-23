# Security and public files

This is a public configuration repository. Hostnames, public certificates, image
IDs, and network routes are visible. Access controls must not depend on hiding them.

Do not commit credentials, live Kubernetes Secrets, kubeconfigs, private keys,
database files, or recovery archives. Use `secret.yaml.example` files with
`REPLACE_WITH_` placeholders. Keep actual values in ignored local files or the
platform secret store. Ignore rules do not protect files already tracked by Git.

Before a commit:

```sh
brew install gitleaks
python3 -m venv .venv
.venv/bin/pip install PyYAML==6.0.3
git config core.hooksPath .githooks
```

The hook checks the staged snapshot. CI checks the tracked files and scans Git
history. GitHub secret scanning and push protection provide another check. These
checks reduce mistakes; they do not prove the absence of every possible secret.
Review the diff before each push. If a real credential is published, revoke it
first; deleting a file or rewriting history does not revoke the credential.

## Service boundaries

- Public Nuke and Pixel pods have restricted egress and container privileges.
- Host-network bots need loopback OpenCode. NetworkPolicy does not isolate them
  from their own host. A host compromise still needs separate response.
- The OpenAI gateway requires a bearer token. Raw OpenCode must listen on loopback.
- Database access requires credentials and verified TLS. Backup upload credentials
  cannot read, delete, or replace saved objects through the Worker.

As of 2026-10-23, the OpenCode host change and gateway Node update still need Pi
SSH access. Pixel's full framework update needs a working database. A clean source
scan does not confirm that those runtime gaps or the host OS are fixed.

Do not put live credentials or private data in a public vulnerability report.
Use a private channel with the repository owner.

# Bot Node runtime patch

These ARM64 images retain the deployed bot application and replace only the
Node binary with the official patched musl build. The bot source repository
also pins Node 24.22.1 for future full builds. Use this patch only for the
existing Node 24 Alpine images; native modules retain the Node 24 ABI.

```sh
docker build --platform linux/arm64 \
  --build-arg APPLICATION_IMAGE=ghcr.io/dylanvanh/discord-opencode-bot@sha256:3908c352254dcf5b0dd18e239221c5de61daf6e00eb2c28f2fef22ec6d3849a2 \
  -t ghcr.io/dylanvanh/discord-opencode-bot:security-20261023 .
docker build --platform linux/arm64 \
  --build-arg APPLICATION_IMAGE=ghcr.io/dylanvanh/discord-gang-prompt-bot@sha256:89c92bf3284eacde595f88287d6a71fa76bef9d83af925a60fea2a9b1e93f960 \
  -t ghcr.io/dylanvanh/discord-gang-prompt-bot:security-20261023 .
```

Verify Node version and SDK imports without networking before pushing. After
rollout, check the runtime version, pod restarts, and Discord login logs.
The deployment manifests pin the published image digests. The patch does not
update npm dependencies or the OS packages in the application layers.

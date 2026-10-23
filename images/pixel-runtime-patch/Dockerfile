# shortcut: Next.js remains old; use the full rebuild after Supabase is restored.
FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS runtime
FROM ghcr.io/dylanvanh/pixel-pythons@sha256:b11286433fb659a6c9be26fb4182ee1a5918566b706f43bf89230bbfb4ca6418
COPY --from=runtime /usr/local/bin/node /usr/local/bin/node
RUN node -e 'if (process.version !== "v22.23.4") process.exit(1); require("@napi-rs/canvas"); require("next/package.json")'

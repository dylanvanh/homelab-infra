# Keep the deployed bot code and configuration; replace its vulnerable Node binary.
ARG APPLICATION_IMAGE
FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS runtime
FROM ${APPLICATION_IMAGE}
COPY --from=runtime /usr/local/bin/node /usr/local/bin/node
RUN node -e 'if (process.version !== "v24.22.1") process.exit(1)'

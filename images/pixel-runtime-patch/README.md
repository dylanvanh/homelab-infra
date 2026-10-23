# Pixel Pythons temporary runtime patch

The complete Next.js 15.5.28 rebuild is blocked by the configured Supabase
hostname returning ENOTFOUND. This image keeps the old application and cached
pages, and replaces Node 20 with the patched Node 22.23.4 binary.

The image build checks the native canvas module loads on Node 22. Verify the
public pages after rollout. This does not patch the bundled Next.js 15.3.8,
npm dependencies, or Alpine OS packages. Replace it with the full source build
after restoring the database and checking both page routes.

Build from this directory:

```sh
docker build --platform linux/arm64 \
  -t ghcr.io/dylanvanh/pixel-pythons:runtime-security-20261023 .
```

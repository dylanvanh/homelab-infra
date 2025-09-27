# pi-docker-config

## reload config

```bash
docker exec nginx-reverse-proxy nginx -s reload
```

## rebuild nginx container

```bash
docker compose up -d --build nginx
```

## get randomly generated pihole password

```bash
docker logs pihole | grep random
```

## bind DNS to LAN IP

Create a `.env` file with your LAN IP (auto-detected):

```bash
LAN_IP=$(ip -4 -o addr show up scope global | awk '!/tailscale0|docker0|podman0/ {print $4; exit}' | cut -d/ -f1)
echo "LAN_IP=$LAN_IP" > .env
```

Bring up Pi-hole (uses `${LAN_IP}` for 53/tcp and 53/udp):

```bash
docker compose up -d --force-recreate --no-deps pihole
```

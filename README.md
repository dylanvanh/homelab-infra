# pi-docker-config

## reload config

```bash
docker exec nginx-reverse-proxy nginx -s reload
```

## rebuild nginx container

```bash
docker compose up -d --build nginx
```

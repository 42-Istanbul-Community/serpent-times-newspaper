# serpentTimes

## Development

```sh
cp .env.example .env      # then fill in the blanks
bun install
docker compose up -d db   # Postgres on :5432
bun run db:migrate
bun run dev
```

## Deployment

A push to the `prod` branch builds the image and publishes it to
`ghcr.io/42-istanbul-community/serpent-times-newspaper` (see
`.github/workflows/release.yml`). It tags `latest`, `sha-<commit>` and a
timestamp; the workflow summary lists them.

The server needs `compose.prod.yaml` and a `.env`. Setting `COMPOSE_FILE` in
that `.env` is what keeps every command below down to plain `docker compose`:

```sh
COMPOSE_FILE=compose.prod.yaml
```

Log in once, with a token that has `read:packages`:

```sh
echo "$GHCR_TOKEN" | docker login ghcr.io -u <user> --password-stdin
```

Deploy, and re-run on every release:

```sh
docker compose pull && docker compose up -d --wait
```

That's the whole deploy. `up` runs the `migrate` service to completion before
starting `app`, so pending migrations apply themselves. To roll back, set `TAG`
in `.env` to a published tag and run the same line.

```sh
docker compose logs -f app
docker compose ps
docker compose exec app bash
docker compose run --rm migrate    # migrations only
```

### Backups

`pg_dump` runs inside the container, where `$POSTGRES_USER` is set:

```sh
mkdir -p backups
docker compose exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' \
  | gzip > "backups/db-$(date +%Y%m%d-%H%M%S).sql.gz"
```

Restoring overwrites the current database:

```sh
gunzip -c backups/db-<stamp>.sql.gz \
  | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Uploads live in the `cdn` volume, not the database — back it up separately:

```sh
docker run --rm -v serpenttimes_cdn:/data -v "$PWD:/out" \
  alpine tar czf /out/cdn.tar.gz -C /data .
```

### Notes

- No TLS in this stack. `APP_PORT` (default 3000) is published on the host;
  firewall it or put a proxy in front, and set `ORIGIN` to the public URL or
  form submissions are rejected.
- Postgres is not published to the host — use `docker compose exec db psql …`.
- PDF baking and cover previews drive a headless Chromium
  (`src/lib/server/pdf.ts`, `src/lib/server/preview.ts`), which is why the
  image installs it and runs with `--no-sandbox`.

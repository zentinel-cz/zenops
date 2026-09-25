#!/bin/sh
set -eu

dump_file=${1:-}
if [ -z "$dump_file" ]; then
  dump_file=$(find "${ZENOPS_BACKUP_ROOT:-/opt/zenops/backups/automatic}" -mindepth 2 -maxdepth 2 -type f -name database.dump -printf '%T@ %p\n' | sort -nr | head -n 1 | cut -d' ' -f2-)
fi
if [ -z "$dump_file" ] || [ ! -r "$dump_file" ]; then
  echo "Readable ZenOps dump was not found." >&2
  exit 1
fi

suffix=$(date -u +%Y%m%d%H%M%S)-$$
container="zenops-restore-check-$suffix"
restore_password="restore-check-$suffix"

cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker run -d --name "$container" --network none \
  -e POSTGRES_PASSWORD="$restore_password" \
  -e POSTGRES_INITDB_ARGS=--auth-local=trust \
  postgres:16-alpine >/dev/null

attempt=0
until docker exec "$container" pg_isready -U postgres -d postgres >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "Temporary restore database did not become ready." >&2
    exit 1
  fi
  sleep 1
done

docker exec "$container" createdb -U postgres zenops_restore
docker cp "$dump_file" "$container:/tmp/database.dump" >/dev/null
docker exec "$container" pg_restore \
  --username postgres \
  --dbname zenops_restore \
  --no-owner \
  --no-acl \
  --exit-on-error \
  /tmp/database.dump

table_count=$(docker exec "$container" psql -U postgres -d zenops_restore -Atqc \
  "select count(*) from information_schema.tables where table_schema = 'public';")
migration_count=$(docker exec "$container" psql -U postgres -d zenops_restore -Atqc \
  "select count(*) from schema_migrations;")

if [ "$table_count" -lt 1 ] || [ "$migration_count" -lt 1 ]; then
  echo "Restore validation failed: tables=$table_count migrations=$migration_count" >&2
  exit 1
fi

echo "Restore verified: tables=$table_count migrations=$migration_count dump=$dump_file"

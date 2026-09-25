#!/bin/sh
set -eu

compose_directory=${ZENOPS_COMPOSE_DIRECTORY:-/opt/zenops/app}
backup_root=${ZENOPS_BACKUP_ROOT:-/opt/zenops/backups/automatic}
lock_file=${ZENOPS_BACKUP_LOCK:-/run/lock/zenops-backup.lock}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
destination="$backup_root/$timestamp"
temporary_dump="$destination/database.dump.partial"
final_dump="$destination/database.dump"

umask 077
install -d -m 700 "$backup_root" "$destination"

exec 9>"$lock_file"
if ! flock -n 9; then
  echo "ZenOps backup is already running." >&2
  exit 1
fi

cd "$compose_directory"
docker compose exec -T postgres pg_dump \
  --username "${POSTGRES_USER:-zenops}" \
  --dbname "${POSTGRES_DB:-zenops}" \
  --format custom \
  --no-owner \
  --no-acl > "$temporary_dump"

test -s "$temporary_dump"
docker run --rm --network none -i postgres:16-alpine \
  pg_restore --list < "$temporary_dump" >/dev/null
mv "$temporary_dump" "$final_dump"
sha256sum "$final_dump" > "$destination/SHA256SUMS"
chmod 600 "$final_dump" "$destination/SHA256SUMS"

echo "$destination"

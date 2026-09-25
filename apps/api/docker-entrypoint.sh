#!/bin/sh
set -eu

if [ -n "${POSTGRES_PASSWORD_FILE:-}" ] && [ -r "$POSTGRES_PASSWORD_FILE" ]; then
  runtime_secret=/tmp/zenops-postgres-password
  cp "$POSTGRES_PASSWORD_FILE" "$runtime_secret"
  chown zenops:zenops "$runtime_secret"
  chmod 400 "$runtime_secret"
  export POSTGRES_PASSWORD_FILE="$runtime_secret"
fi

exec su-exec zenops "$@"

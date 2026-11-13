#!/bin/sh
set -eu
PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/packages/ContainerManager/target/usr/bin:$PATH"
export PATH
ROOT=/volume2/webapps
SOURCE="$ROOT/careerfolio/source"
ACCOUNTS="$ROOT/accounts/source"
ENV_FILE="$ROOT/accounts/.env"

# Never silently create an empty substitute on the system disk after a mount failure.
awk '$2 == "/volume2" {found=1} END {exit !found}' /proc/mounts || { echo 'Volume 2 is not mounted. Stopping.' >&2; exit 1; }
test "$(cat "$ROOT/careerfolio/data/.foredu-storage")" = careerfolio-v1
test "$(cat "$ROOT/accounts/data/.foredu-storage")" = accounts-v1
test -f "$ENV_FILE"
test "$(stat -c '%a' "$ENV_FILE")" = 600 || { echo 'accounts/.env must have mode 600.' >&2; exit 1; }
test -f "$ACCOUNTS/compose.yml"
for file in server.mjs Dockerfile Dockerfile.db compose.yml init.sql; do
  # These are managed code copies; secrets and data are outside accounts/source.
  cp "$SOURCE/deploy/accounts/$file" "$ACCOUNTS/$file"
done
docker network inspect foredu-shared >/dev/null 2>&1 || docker network create foredu-shared >/dev/null
# Quiet config validation: NEVER print expanded SMTP/JWT/database secrets.
docker compose --env-file "$ENV_FILE" -f "$ACCOUNTS/compose.yml" config --quiet
# A previous init-script permission failure can leave a valid DB without the auth
# schema. Preserve that DB and apply only our idempotent schema creation script.
docker compose --env-file "$ENV_FILE" -f "$ACCOUNTS/compose.yml" up -d --build db
attempt=0
until docker compose --env-file "$ENV_FILE" -f "$ACCOUNTS/compose.yml" exec -T --user postgres db pg_isready -U foredu_auth -d accounts >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then echo 'Database is not ready. Data preserved; authentication startup skipped.' >&2; exit 1; fi
  sleep 2
done
docker compose --env-file "$ENV_FILE" -f "$ACCOUNTS/compose.yml" exec -T --user postgres db psql -v ON_ERROR_STOP=1 -U foredu_auth -d accounts -f /docker-entrypoint-initdb.d/10-auth-schema.sql
docker compose --env-file "$ENV_FILE" -f "$ACCOUNTS/compose.yml" up -d --build
attempt=0
until curl -fsS http://127.0.0.1:7320/api/health >/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then echo 'Account service is not ready. Application start skipped.' >&2; exit 1; fi
  sleep 2
done
docker compose -f "$SOURCE/compose.foredu.yml" config --quiet
docker compose -f "$SOURCE/compose.foredu.yml" up -d --build
attempt=0
until curl -fsS http://127.0.0.1:7310/api/health >/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then echo 'Careerfolio health check failed.' >&2; exit 1; fi
  sleep 2
done
echo 'Health checks passed. Verify HTTPS, Gmail delivery, verification and teacher/student access before opening to students.'

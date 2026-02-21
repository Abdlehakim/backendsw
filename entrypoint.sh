#!/bin/sh
set -eu

if [ "${RUN_MODE:-}" = "api" ]; then
  echo "[entrypoint] RUN_MODE=api"
  echo "[entrypoint] prisma generate + migrate deploy"
  npx prisma generate --schema=./prisma/schema.prisma
  npx prisma migrate deploy --schema=./prisma/schema.prisma
  exec node -r module-alias/register dist/src/app.js
fi

if [ "${RUN_MODE:-}" = "worker" ]; then
  echo "[entrypoint] RUN_MODE=worker"
  exec node -r module-alias/register dist/src/jobs/invoiceWorker.js
fi

echo "[entrypoint] ERROR: RUN_MODE must be 'api' or 'worker' (got: '${RUN_MODE:-empty}')"
exit 1
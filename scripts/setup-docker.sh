#!/usr/bin/env bash
# Local development only. Does not remove volumes or reset an existing database.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v docker >/dev/null || { echo 'Docker + Compose are required.' >&2; exit 1; }
[ -f backend/.env ] || cp backend/.env.example backend/.env
docker compose build backend frontend
docker compose up -d --wait postgres redis
docker compose run --rm --no-deps backend composer install --no-interaction --prefer-dist
if ! grep -Eq '^APP_KEY=.+$' backend/.env; then
  docker compose run --rm --no-deps backend php artisan key:generate
fi
docker compose run --rm --no-deps backend php artisan migrate --seed
docker compose up -d backend frontend
echo 'BestPharma API mode: http://localhost:3001 — API: http://localhost:8002/api/v1/health'
echo 'Fictitious local accounts only. Never expose this development configuration publicly.'

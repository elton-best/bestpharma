#!/usr/bin/env bash
set -e
echo "=== BEGPHARMA setup ==="
cd "$(dirname "$0")/.."
echo "[1/4] Backend"
cd backend
[ -f .env ] || cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
cd ..
echo "[2/4] Frontend officine"
cd frontend && npm install && cd ..
echo "[3/4] Admin BEG"
cd admin && npm install && cd ..
echo "OK — docker compose up --build (ou php artisan serve + npm run dev)"

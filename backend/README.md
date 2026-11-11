# BestPharma — Backend (Laravel 12)

Stack identique ERPSAAS : Laravel 12 / PHP 8.4, PostgreSQL 16, Redis, Sanctum, Spatie Permission, Horizon, Telescope/Pulse.

## Démarrage
```bash
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=8000
```

## Modules DDD
Voir `app/Modules/` — chaque module : `Config/`, `Controllers/`, `Models/`, `Requests/`, `Resources/`, `Services/`, `Providers/*ServiceProvider.php`, `Database/Migrations/`, `routes.php`.
Isolation officine via trait `BelongsToCompany` + `TenantScope`, header `X-Officine-ID`, middleware `tenant.context` + `module.active`.

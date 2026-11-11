<?php
declare(strict_types=1);
namespace App\Modules\Catalogue\Providers;
use Illuminate\Support\ServiceProvider;
class CatalogueServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../Config/catalogue.php', 'catalogue');
    }
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
        if (file_exists(__DIR__.'/../routes.php')) {
            $this->loadRoutesFrom(__DIR__.'/../routes.php');
        }
    }
}

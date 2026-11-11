<?php
declare(strict_types=1);
namespace App\Modules\PlatformAdmin\Providers;
use Illuminate\Support\ServiceProvider;
class PlatformAdminServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../Config/platformadmin.php', 'platformadmin');
    }
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
        if (file_exists(__DIR__.'/../routes.php')) {
            $this->loadRoutesFrom(__DIR__.'/../routes.php');
        }
    }
}

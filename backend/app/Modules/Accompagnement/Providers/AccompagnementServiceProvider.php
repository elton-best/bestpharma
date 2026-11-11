<?php
declare(strict_types=1);
namespace App\Modules\Accompagnement\Providers;
use Illuminate\Support\ServiceProvider;
class AccompagnementServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../Config/accompagnement.php', 'accompagnement');
    }
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
        if (file_exists(__DIR__.'/../routes.php')) {
            $this->loadRoutesFrom(__DIR__.'/../routes.php');
        }
    }
}

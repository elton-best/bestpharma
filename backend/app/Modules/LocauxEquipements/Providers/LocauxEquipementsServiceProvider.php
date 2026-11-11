<?php
declare(strict_types=1);
namespace App\Modules\LocauxEquipements\Providers;
use Illuminate\Support\ServiceProvider;
class LocauxEquipementsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../Config/locauxequipements.php', 'locauxequipements');
        $this->mergeConfigFrom(__DIR__.'/../Config/temperatures.php', 'temperatures');
    }
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
        if (file_exists(__DIR__.'/../routes.php')) {
            $this->loadRoutesFrom(__DIR__.'/../routes.php');
        }
    }
}

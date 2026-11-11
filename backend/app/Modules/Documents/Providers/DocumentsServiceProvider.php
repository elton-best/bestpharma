<?php
declare(strict_types=1);
namespace App\Modules\Documents\Providers;
use Illuminate\Support\ServiceProvider;
class DocumentsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../Config/documents.php', 'documents');
    }
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
        if (file_exists(__DIR__.'/../routes.php')) {
            $this->loadRoutesFrom(__DIR__.'/../routes.php');
        }
    }
}

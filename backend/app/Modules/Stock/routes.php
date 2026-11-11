<?php

declare(strict_types=1);

use App\Modules\Stock\Controllers\Module11ProduitStockController;
use Illuminate\Support\Facades\Route;

// Routes API du module Stock & Approvisionnements — préfixées /api/v1/stock via ModuleServiceProvider
Route::prefix('api/v1/stock')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:stock'])
    ->controller(Module11ProduitStockController::class)
    ->group(function (): void {
        Route::get('overview', 'overview');

        // 1. Catalogue Produits & Unités
        Route::get('products', 'productsIndex');
        Route::post('products', 'storeProduct')->middleware('throttle:identity');
        Route::put('products/{id}', 'updateProduct')->whereNumber('id')->middleware('throttle:identity');

        // 2. Commandes & Suggestions
        Route::get('order-suggestions', 'orderSuggestions');
        Route::get('orders', 'ordersIndex');
        Route::post('orders', 'storeOrder')->middleware('throttle:identity');
        Route::post('orders/{id}/approve', 'approveOrder')->whereNumber('id')->middleware('throttle:identity');

        // 3. Réceptions partielles & idempotentes
        Route::get('receipts', 'receiptsIndex');
        Route::post('receipts', 'storeReceipt')->middleware('throttle:identity');

        // 4. Lots FEFO, Mouvements & Quarantaine
        Route::get('lots', 'lotsIndex');
        Route::get('movements', 'movementsIndex');
        Route::post('movements', 'recordMovement')->middleware('throttle:identity');
        Route::post('lots/{lotId}/quarantine', 'quarantineAction')->whereNumber('lotId')->middleware('throttle:identity');

        // 5. Inventaires Physiques
        Route::get('inventories', 'inventoriesIndex');
        Route::post('inventories', 'storeInventory')->middleware('throttle:identity');
        Route::post('inventories/{id}/approve', 'approveInventory')->whereNumber('id')->middleware('throttle:identity');

        // 6. Chaîne du froid par équipement
        Route::get('temperatures', 'temperaturesIndex');
        Route::post('temperatures', 'storeTemperature')->middleware('throttle:identity');
        Route::post('temperatures/{id}/decision', 'decideTemperature')->whereNumber('id')->middleware('throttle:identity');
    });

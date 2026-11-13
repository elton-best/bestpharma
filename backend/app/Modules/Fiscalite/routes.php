<?php

declare(strict_types=1);

use App\Modules\Fiscalite\Controllers\FiscaliteController;
use Illuminate\Support\Facades\Route;

// Webhook public signé HMAC-SHA256 FeexPay
Route::prefix('api/v1/fiscalite')
    ->middleware(['api'])
    ->group(function (): void {
        Route::post('/feexpay/webhook', [FiscaliteController::class, 'feexpayWebhook']);
    });

// Routes API authentifiées du module Fiscalite — préfixées /api/v1/fiscalite
Route::prefix('api/v1/fiscalite')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:fiscalite'])
    ->group(function (): void {
        Route::get('/overview', [FiscaliteController::class, 'overview']);

        Route::get('/invoices', [FiscaliteController::class, 'invoicesIndex']);
        Route::post('/invoices', [FiscaliteController::class, 'storeInvoice']);
        Route::post('/invoices/{id}/certify', [FiscaliteController::class, 'certifyInvoice']);

        Route::get('/feexpay/intents', [FiscaliteController::class, 'feexpayIntentsIndex']);
        Route::post('/feexpay/intents', [FiscaliteController::class, 'initiateFeexPay']);
    });

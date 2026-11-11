<?php

declare(strict_types=1);

use App\Modules\Tresorerie\Controllers\Module13CaisseFinancesController;
use Illuminate\Support\Facades\Route;

// Routes API du module Caisse & Trésorerie — préfixées /api/v1/tresorerie via ModuleServiceProvider
Route::prefix('api/v1/tresorerie')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:tresorerie'])
    ->controller(Module13CaisseFinancesController::class)
    ->group(function (): void {
        Route::get('overview', 'overview');
        Route::get('registers', 'registersIndex');
        Route::post('registers', 'storeRegister')->middleware('throttle:identity');
        Route::get('sessions', 'sessionsIndex');
        Route::post('sessions/open', 'openSession')->middleware('throttle:identity');
        Route::post('sessions/{id}/close', 'closeSession')->whereNumber('id')->middleware('throttle:identity');

        Route::get('transactions', 'transactionsIndex');
        Route::post('transactions', 'storeTransaction')->middleware('throttle:identity');
        Route::post('transactions/{id}/reverse', 'reverseTransaction')->whereNumber('id')->middleware('throttle:identity');

        Route::get('expenses', 'expensesIndex');
        Route::post('expenses', 'storeExpense')->middleware('throttle:identity');
        Route::post('expenses/{id}/decision', 'decideExpense')->whereNumber('id')->middleware('throttle:identity');

        Route::get('handovers', 'handoversIndex');
        Route::post('handovers', 'storeHandover')->middleware('throttle:identity');
        Route::post('handovers/{id}/sign-incoming', 'signIncomingHandover')->whereNumber('id')->middleware('throttle:identity');

        Route::get('reconciliations', 'reconciliationsIndex');
        Route::post('reconciliations', 'storeReconciliation')->middleware('throttle:identity');
    });

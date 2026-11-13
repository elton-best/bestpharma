<?php
declare(strict_types=1);
use App\Modules\Documents\Controllers\DocumentsController;
use App\Modules\Documents\Controllers\DocumentLibraryController;
use App\Modules\Documents\Controllers\ReferenceCorpusController;
use Illuminate\Support\Facades\Route;
Route::prefix('api/v1/documents')->middleware(['api','auth:sanctum','tenant.context','module.active:documents'])->group(function (): void {
    Route::prefix('library/reference-corpus')->controller(ReferenceCorpusController::class)->group(function (): void {
        Route::get('', 'index');
        Route::get('{id}', 'show')->where('id', '[a-f0-9]{24}');
        Route::get('{id}/file', 'download')->where('id', '[a-f0-9]{24}');
        Route::post('{id}/imports', 'import')->where('id', '[a-f0-9]{24}')->middleware('throttle:identity');
    });
    Route::get('', [DocumentsController::class,'index']);
    Route::post('', [DocumentsController::class,'store']);
    Route::put('{id}', [DocumentsController::class,'update'])->whereNumber('id');
    Route::post('{id}/submit', [DocumentsController::class,'submit'])->whereNumber('id');
    Route::post('{id}/approve', [DocumentsController::class,'approve'])->whereNumber('id')->middleware('throttle:identity');
    Route::post('{id}/revisions', [DocumentsController::class,'revise'])->whereNumber('id');
    Route::post('{id}/attachments', [DocumentsController::class,'upload'])->whereNumber('id');
    Route::get('{id}/attachments/{attachmentId}', [DocumentsController::class,'download'])->whereNumber('id')->whereNumber('attachmentId');
    Route::prefix('library')->controller(DocumentLibraryController::class)->group(function (): void {
        Route::get('status', 'status');
        Route::get('sources', 'sources');
        Route::post('sources/import', 'import');
        Route::get('sources/{id}/file', 'downloadSource')->whereNumber('id');
        Route::post('sources/{id}/qualify', 'qualify')->whereNumber('id');
        Route::post('sources/{id}/approve', 'approveSource')->whereNumber('id')->middleware('throttle:identity');
        Route::get('templates', 'templates');
        Route::post('templates', 'createTemplate');
        Route::post('templates/{id}/approve', 'approveTemplate')->whereNumber('id')->middleware('throttle:identity');
        Route::post('templates/{id}/instances', 'instantiate')->whereNumber('id');
        Route::get('followups/{category}', 'followups');
        Route::post('followups/{category}', 'createFollowup');
        Route::put('followups/{id}', 'updateFollowup')->whereNumber('id');
    });
});

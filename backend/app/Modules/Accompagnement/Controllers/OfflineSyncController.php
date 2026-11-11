<?php

declare(strict_types=1);

namespace App\Modules\Accompagnement\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Accompagnement\Services\OfflineSyncService;
use App\Modules\Accompagnement\Services\SyncConflict;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Validator;

final class OfflineSyncController extends Controller
{
    public function __construct(private readonly OfflineSyncService $sync)
    {
    }

    public function push(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'operations' => ['required', 'array', 'min:1', 'max:50'],
            'operations.*.operation_id' => ['required', 'uuid'],
            'operations.*.entity' => ['required', 'in:support_request_draft'],
            'operations.*.action' => ['required', 'in:CREATE'],
            'operations.*.client_timestamp' => ['required', 'string', 'date'],
            'operations.*.payload' => ['required', 'array'],
            'operations.*.payload.title' => ['nullable', 'string', 'max:180'],
            'operations.*.payload.description' => ['nullable', 'string', 'max:5000'],
            'operations.*.payload.contact' => ['nullable', 'string', 'max:180'],
            'operations.*.payload.theme' => ['nullable', 'string', 'max:120'],
            'operations.*.payload.availability' => ['nullable', 'string', 'max:250'],
            'operations.*.payload.urgency' => ['sometimes', 'in:normal,high,low'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'code' => 'validation_error',
                'message' => 'Le lot de synchronisation est invalide.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            return response()->json($this->sync->push($request, $validator->validated()));
        } catch (SyncConflict $conflict) {
            return response()->json([
                'code' => 'sync_conflict',
                'message' => $conflict->getMessage(),
            ], 409);
        } catch (QueryException $exception) {
            report($exception);

            return response()->json([
                'code' => 'sync_failed',
                'message' => 'Le lot n’a pas été synchronisé. Il peut être renvoyé après reconnexion.',
            ], 500);
        }
    }
}

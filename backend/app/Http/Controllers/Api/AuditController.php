<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    /**
     * Consultation filtrable du journal d'audit inaltérable (E0-S4, NF-06, NF-07)
     */
    public function index(Request $request, ?string $officineId = null): JsonResponse
    {
        $finalOfficineId = $officineId ?: $request->user()?->officines()->first()?->id;

        $query = AuditLog::query()
            ->when($finalOfficineId, fn($q) => $q->where('officine_id', $finalOfficineId))
            ->orderByDesc('id');

        if ($request->filled('table_name')) {
            $query->where('table_name', $request->table_name);
        }

        if ($request->filled('action')) {
            $query->where('action', strtoupper($request->action));
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('date_from')) {
            $query->where('server_timestamp', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('server_timestamp', '<=', $request->date_to);
        }

        $logs = $query->paginate($request->input('per_page', 50));

        return response()->json($logs);
    }
}

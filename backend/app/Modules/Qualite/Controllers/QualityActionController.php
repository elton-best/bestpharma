<?php

declare(strict_types=1);
namespace App\Modules\Qualite\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Qualite\Models\QualityAction;
use App\Modules\Qualite\Requests\SaveQualityActionRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QualityActionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless(in_array('qualite.read', $request->attributes->get('officine.permissions', []), true), 403);
        return response()->json(['data' => QualityAction::query()->latest('id')->get()]);
    }

    public function store(SaveQualityActionRequest $request): JsonResponse
    {
        $action = DB::transaction(function () use ($request) {
            $action = new QualityAction($request->validated());
            $action->officine_id = app('tenant.officine_id');
            $action->created_by = $request->user()->id;
            $action->save();
            $this->audit($request, $action, 'quality.action.created');
            return $action;
        });
        return response()->json(['data' => $action], 201);
    }

    public function update(SaveQualityActionRequest $request, string $id): JsonResponse
    {
        // Lookup happens AFTER tenant middleware, not through implicit route binding.
        $action = DB::transaction(function () use ($request, $id) {
            $action = QualityAction::query()->lockForUpdate()->findOrFail($id);
            $action->fill($request->validated());
            $action->save();
            $this->audit($request, $action, 'quality.action.updated');
            return $action;
        });
        return response()->json(['data' => $action]);
    }

    private function audit(Request $request, QualityAction $action, string $event): void
    {
        DB::table('tenant_audit_logs')->insert([
            'officine_id' => app('tenant.officine_id'),
            'user_id' => $request->user()->id,
            'action' => $event,
            // Do not copy potentially sensitive free text to audit logs.
            'payload' => json_encode(['action_id' => $action->id, 'status' => $action->status]),
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }
}

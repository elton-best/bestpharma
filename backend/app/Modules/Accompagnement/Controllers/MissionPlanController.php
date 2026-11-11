<?php

namespace App\Modules\Accompagnement\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Accompagnement\Services\MissionAccess as Access;
use App\Modules\Identity\Services\Outbox;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MissionPlanController extends Controller
{
    private function mission(Request $request, string $id, bool $write = false): array
    {
        $office = (int) app('tenant.officine_id');
        Access::lockOffice($request, $office);
        $mission = DB::table('support_missions as m')
            ->join('support_requests as r', 'r.id', '=', 'm.support_request_id')
            ->where('r.officine_id', $office)
            ->where('m.id', $id)
            ->select('m.*')
            ->first();
        abort_unless($mission && Access::allowed($request, $office, (int) $mission->id, $write, true), 404);
        if ($write) {
            abort_unless($mission->status === 'active', 409, 'La mission doit être en cours.');
        }
        return [$office, $mission];
    }

    private function plan(object $mission): ?object
    {
        return DB::table('support_plans')->where('mission_id', $mission->id)->first();
    }

    private function present(object $plan, bool $canEdit): array
    {
        $versions = DB::table('support_plan_versions')
            ->where('plan_id', $plan->id)
            ->when(!$canEdit, fn ($query) => $query->whereIn('state', ['submitted', 'approved', 'changes_requested']))
            ->orderByDesc('revision')
            ->get()
            ->map(function ($version) {
                $version->snapshot = json_decode($version->snapshot, true);
                return $version;
            });

        $visibleState = $canEdit ? $plan->status : ($versions->first()->state ?? null);
        return ['id' => $plan->id, 'status' => $visibleState, 'version' => $plan->version,
            'can_edit' => $canEdit, 'versions' => $versions];
    }

    public function index(Request $request, string $id): JsonResponse
    {
        return DB::transaction(function () use ($request, $id) {
            [, $mission] = $this->mission($request, $id);
            $canEdit = Access::allowed($request, (int) app('tenant.officine_id'), (int) $mission->id, true, true)
                && $mission->status === 'active';
            $plan = $this->plan($mission);
            $canApprove = (bool) $request->attributes->get('officine.is_admin');
            if ($plan && !$canEdit) {
                $hasSharedVersion = DB::table('support_plan_versions')->where('plan_id', $plan->id)
                    ->whereIn('state', ['submitted', 'approved', 'changes_requested'])->exists();
                if (!$hasSharedVersion) {
                    return response()->json(['data' => null, 'can_approve' => $canApprove, 'can_edit' => $canEdit]);
                }
            }
            return response()->json(['data' => $plan ? $this->present($plan, $canEdit) : null,
                'can_approve' => $canApprove, 'can_edit' => $canEdit]);
        })->header('Cache-Control', 'no-store');
    }

    public function save(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'version' => ['required', 'integer', 'min:0'],
            'title' => ['required', 'string', 'max:180', 'regex:/\\S/u'],
            'objectives' => ['required', 'array', 'min:1', 'max:30'],
            'objectives.*' => ['required', 'string', 'max:500', 'regex:/\\S/u'],
            'starts_on' => ['required', 'date_format:Y-m-d'],
            'ends_on' => ['required', 'date_format:Y-m-d', 'after_or_equal:starts_on'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.source_finding_id' => ['nullable', 'integer', 'min:1'],
            'items.*.expected_result' => ['required', 'string', 'max:1000', 'regex:/\\S/u'],
            'items.*.owner' => ['required', 'string', 'max:160', 'regex:/\\S/u'],
            'items.*.due_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:starts_on', 'before_or_equal:ends_on'],
            'items.*.priority' => ['required', 'in:low,normal,high'],
            'items.*.evidence_expected' => ['nullable', 'string', 'max:1000'],
            'items.*.effectiveness_criteria' => ['required', 'string', 'max:1000', 'regex:/\\S/u'],
            'items.*.comment' => ['nullable', 'string', 'max:2000'],
            'confirmed' => ['required', 'accepted'],
        ]);

        return DB::transaction(function () use ($request, $id, $data) {
            [$office, $mission] = $this->mission($request, $id, true);
            abort_unless($data['starts_on'] >= $mission->starts_on && $data['ends_on'] <= $mission->ends_on, 422,
                'La période du plan doit rester dans la période de la mission.');
            $plan = $this->plan($mission);
            $expected = (int) $data['version'];
            abort_if($plan && ($plan->version !== $expected || !in_array($plan->status, ['draft', 'changes_requested'], true)), 409, 'Version périmée ou plan non modifiable.');
            abort_if(!$plan && $expected !== 0, 409, 'Le plan a changé. Rechargez la mission.');

            foreach ($data['items'] as $item) {
                if (!empty($item['source_finding_id'])) {
                    $finding = DB::table('support_findings')->where('id', $item['source_finding_id'])
                        ->where('mission_id', $mission->id)->where('status', 'shared')->exists();
                    abort_unless($finding, 422, 'Le constat source est absent, privé ou rattaché à une autre mission.');
                }
            }

            $snapshot = [
                'title' => trim($data['title']),
                'objectives' => array_values(array_map('trim', $data['objectives'])),
                'starts_on' => $data['starts_on'], 'ends_on' => $data['ends_on'],
                // These are planning references only; M4 remains the source of truth for actions.
                'items' => array_map(fn ($item) => [
                    'source_finding_id' => $item['source_finding_id'] ?? null,
                    'expected_result' => trim($item['expected_result']), 'owner' => trim($item['owner']),
                    'due_date' => $item['due_date'], 'priority' => $item['priority'],
                    'evidence_expected' => isset($item['evidence_expected']) ? trim($item['evidence_expected']) : null,
                    'effectiveness_criteria' => trim($item['effectiveness_criteria']),
                    'comment' => isset($item['comment']) ? trim($item['comment']) : null,
                    'action_module' => 'module_04',
                ], $data['items']),
            ];

            if (!$plan) {
                $planId = DB::table('support_plans')->insertGetId(['mission_id' => $mission->id, 'status' => 'draft',
                    'version' => 1, 'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
                DB::table('support_plan_versions')->insert(['plan_id' => $planId, 'revision' => 1, 'state' => 'draft',
                    'snapshot' => json_encode($snapshot), 'created_by' => $request->user()->id,
                    'created_at' => now(), 'updated_at' => now()]);
            } else {
                $revision = (int) DB::table('support_plan_versions')->where('plan_id', $plan->id)->max('revision') + 1;
                DB::table('support_plans')->where('id', $plan->id)->update(['status' => 'draft', 'version' => $plan->version + 1, 'updated_at' => now()]);
                DB::table('support_plan_versions')->insert(['plan_id' => $plan->id, 'revision' => $revision, 'state' => 'draft',
                    'snapshot' => json_encode($snapshot), 'created_by' => $request->user()->id,
                    'created_at' => now(), 'updated_at' => now()]);
                $planId = $plan->id;
            }
            return response()->json(['data' => $this->present(DB::table('support_plans')->where('id', $planId)->first(), true)]);
        });
    }

    public function submit(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['version' => ['required', 'integer', 'min:1'], 'confirmed' => ['required', 'accepted']]);
        return $this->transition($request, $id, 'submit', $data);
    }

    public function decide(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['version' => ['required', 'integer', 'min:1'], 'decision' => ['required', 'in:approve,request_changes'],
            'reason' => ['required_if:decision,request_changes', 'nullable', 'string', 'max:2000'], 'confirmed' => ['required', 'accepted']]);
        return $this->transition($request, $id, $data['decision'], $data);
    }

    private function transition(Request $request, string $id, string $action, array $data): JsonResponse
    {
        return DB::transaction(function () use ($request, $id, $action, $data) {
            [$office, $mission] = $this->mission($request, $id, $action === 'submit');
            $plan = $this->plan($mission);
            abort_unless($plan, 404);
            abort_unless($plan->version === (int) $data['version'], 409, 'Version du plan périmée.');
            $version = DB::table('support_plan_versions')->where('plan_id', $plan->id)->orderByDesc('revision')->lockForUpdate()->first();
            abort_unless($version && $version->state === ($action === 'submit' ? 'draft' : 'submitted'), 409, 'État du plan incompatible avec cette décision.');
            if ($action !== 'submit') {
                abort_unless((bool) $request->attributes->get('officine.is_admin'), 403, 'Seul un administrateur actif de l’officine peut décider.');
            }
            $state = match ($action) { 'submit' => 'submitted', 'approve' => 'approved', default => 'changes_requested' };
            DB::table('support_plan_versions')->where('id', $version->id)->update([
                'state' => $state, 'submitted_at' => $action === 'submit' ? now() : $version->submitted_at,
                'decided_at' => $action === 'submit' ? null : now(), 'decided_by' => $action === 'submit' ? null : $request->user()->id,
                'decision' => $action === 'submit' ? null : $action, 'decision_reason' => $action === 'submit' ? null : ($data['reason'] ?? null), 'updated_at' => now(),
            ]);
            DB::table('support_plans')->where('id', $plan->id)->update(['status' => $state,
                'version' => $plan->version + 1, 'updated_at' => now()]);
            Access::event($request, $mission, $office, 'plan_'.$state, 'Une version du plan a changé d’état. Aucun contenu métier dans le journal.');
            Outbox::office($office, 'mission-plan:'.$plan->id.':'.$version->revision.':'.$state,
                $state === 'submitted' ? 'Plan soumis pour validation' : 'Décision sur le plan d’accompagnement',
                $state === 'approved' ? 'Une version du plan a été approuvée.' : ($state === 'changes_requested' ? 'Des modifications sont demandées sur une version du plan.' : 'Une version du plan attend une décision dans votre espace autorisé.'));
            return response()->json(['message' => 'Décision de plan enregistrée.', 'status' => $state, 'version' => $plan->version + 1]);
        });
    }
}

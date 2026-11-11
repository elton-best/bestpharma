<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Accompagnement\Services\MissionAccess;
use App\Modules\Identity\Services\Outbox;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Module 04 action register. Action records here are the sole source of truth for M4. */
final class Module4ActionController extends Controller
{
    private function office(Request $request, bool $write = false): int
    {
        $office = (int) app('tenant.officine_id');
        $permissions = (array) $request->attributes->get('officine.permissions', []);
        $admin = (bool) $request->attributes->get('officine.is_admin', false);
        abort_unless($admin || in_array($write ? 'qualite.write' : 'qualite.read', $permissions, true), 403, 'Permission M4 requise.');
        return $office;
    }

    private function owner(int $office, int $userId): void
    {
        $member = DB::table('officine_user')->where('officine_id', $office)->where('user_id', $userId)->where('is_active', true)->exists();
        abort_unless($member, 422, 'Le responsable doit être un membre actif de cette officine.');
    }

    private function logEvent(Request $request, int $office, int $action, string $event, array $snapshot = []): void
    {
        DB::table('module4_action_events')->insert(['officine_id' => $office, 'action_id' => $action,
            'actor_id' => $request->user()->id, 'event' => $event,
            'snapshot' => $snapshot ? json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE) : null, 'created_at' => now()]);
    }

    private function action(int $office, int $id, bool $lock = false): object
    {
        $query = DB::table('module4_actions')->where('officine_id', $office)->where('id', $id);
        if ($lock) $query->lockForUpdate();
        $action = $query->first();
        abort_unless($action, 404);
        return $action;
    }

    private function addSources(Request $request, int $office, int $actionId, array $sources): void
    {
        foreach ($sources as $source) {
            $type = $source['type'];
            $sourceId = $source['id'] ?? null;
            $label = trim($source['label'] ?? '');
            if ($type === 'finding') {
                $row = DB::table('support_findings as f')->join('support_missions as m', 'm.id', '=', 'f.mission_id')
                    ->join('support_requests as r', 'r.id', '=', 'm.support_request_id')->where('r.officine_id', $office)
                    ->where('f.id', $sourceId)->where('f.status', 'shared')->first(['f.title']);
                abort_unless($row, 422, 'Le constat doit être partagé et appartenir à cette officine.');
                $label = $label ?: $row->title;
            } elseif ($type === 'mission') {
                $row = DB::table('support_missions as m')->join('support_requests as r', 'r.id', '=', 'm.support_request_id')
                    ->where('r.officine_id', $office)->where('m.id', $sourceId)->first(['m.title']);
                abort_unless($row, 422, 'La mission source n’appartient pas à cette officine.');
                $label = $label ?: $row->title;
            } elseif ($type === 'document') {
                $row = DB::table('documents')->where('officine_id', $office)->where('id', $sourceId)->first(['title', 'version']);
                abort_unless($row, 422, 'Le document source n’appartient pas à cette officine.');
                $label = $label ?: $row->title;
            } elseif (!in_array($type, ['risk', 'complaint', 'reclamation'], true)) {
                abort(422, 'Type de source non pris en charge.');
            } else {
                abort_unless($sourceId === null && $label !== '', 422, 'Les sources non intégrées sont référencées par libellé seulement, sans identifiant métier non vérifié.');
            }
            abort_if($label === '', 422, 'Une source descriptive est requise.');
            DB::table('module4_action_sources')->insertOrIgnore(['officine_id' => $office, 'action_id' => $actionId,
                'source_type' => $type, 'source_id' => $sourceId, 'label' => Str::limit($label, 220, ''),
                'created_by' => $request->user()->id, 'created_at' => now()]);
        }
    }

    public function overview(Request $request): JsonResponse
    {
        $office = $this->office($request);
        $query = DB::table('module4_actions')->where('officine_id', $office);
        if ($request->filled('status')) $query->where('status', $request->string('status'));
        if ($request->filled('owner_id')) $query->where('owner_id', (int) $request->input('owner_id'));
        if ($request->filled('source_type')) $query->whereIn('id', DB::table('module4_action_sources')->where('officine_id', $office)->where('source_type', $request->input('source_type'))->select('action_id'));
        if ($request->filled('search')) $query->whereRaw('LOWER(title) LIKE LOWER(?)', ['%'.$request->input('search').'%']);
        $page = $query->orderByDesc('id')->paginate(min(100, max(1, (int) $request->input('per_page', 20))));
        foreach ($page->items() as $row) {
            $row->overdue = $row->due_date < now()->toDateString() && !in_array($row->status, ['closed', 'cancelled'], true);
            $row->sources = DB::table('module4_action_sources')->where('action_id', $row->id)->get();
        }
        $counts = DB::table('module4_actions')->where('officine_id', $office)->selectRaw("status, count(*) as total")->groupBy('status')->pluck('total', 'status');
        $overdue = DB::table('module4_actions')->where('officine_id', $office)->where('due_date', '<', now()->toDateString())->whereNotIn('status', ['closed', 'cancelled'])->count();
        return response()->json(['data' => $page, 'indicators' => ['by_status' => $counts, 'overdue' => $overdue,
            'definition' => 'Échéance antérieure à la date locale du jour et état différent de clôturé/annulé.', 'updated_at' => now()->toISOString()]]);
    }

    public function plans(Request $request): JsonResponse
    {
        $office = $this->office($request);
        return response()->json(['data' => DB::table('action_plans')->where('officine_id', $office)->orderByDesc('id')->paginate(25),
            'can_write' => $this->canWrite($request), 'can_approve' => (bool) $request->attributes->get('officine.is_admin')]);
    }

    private function canWrite(Request $request): bool
    {
        return (bool) $request->attributes->get('officine.is_admin') || in_array('qualite.write', (array) $request->attributes->get('officine.permissions', []), true);
    }

    public function createPlan(Request $request): JsonResponse
    {
        $office = $this->office($request, true);
        $data = $request->validate(['title' => 'required|string|max:180', 'objective' => 'required|string|max:5000',
            'starts_on' => 'required|date_format:Y-m-d', 'ends_on' => 'required|date_format:Y-m-d|after_or_equal:starts_on',
            'owner_id' => 'required|integer|min:1', 'confirmed' => 'required|accepted']);
        $this->owner($office, (int) $data['owner_id']);
        $id = DB::transaction(function () use ($request, $office, $data) {
            $reference = 'ACT-'.strtoupper(Str::random(10));
            $snapshot = ['title' => trim($data['title']), 'objective' => trim($data['objective']), 'starts_on' => $data['starts_on'], 'ends_on' => $data['ends_on'], 'owner_id' => (int) $data['owner_id']];
            $id = DB::table('action_plans')->insertGetId(['officine_id' => $office, 'reference' => $reference, 'title' => $snapshot['title'],
                'objective' => $snapshot['objective'], 'starts_on' => $snapshot['starts_on'], 'ends_on' => $snapshot['ends_on'],
                'owner_id' => $snapshot['owner_id'], 'status' => 'draft', 'version' => 1, 'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('action_plan_versions')->insert(['plan_id' => $id, 'revision' => 1, 'status' => 'draft', 'snapshot' => json_encode($snapshot),
                'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            return $id;
        });
        return response()->json(['data' => DB::table('action_plans')->where('id', $id)->first()], 201);
    }

    public function updatePlan(Request $request, int $id): JsonResponse
    {
        $office = $this->office($request, true);
        $data = $request->validate(['version' => 'required|integer|min:1', 'title' => 'required|string|max:180',
            'objective' => 'required|string|max:5000', 'starts_on' => 'required|date_format:Y-m-d',
            'ends_on' => 'required|date_format:Y-m-d|after_or_equal:starts_on', 'owner_id' => 'required|integer|min:1']);
        $this->owner($office, (int) $data['owner_id']);
        return DB::transaction(function () use ($request, $office, $id, $data) {
            $plan = DB::table('action_plans')->where('officine_id', $office)->where('id', $id)->lockForUpdate()->first(); abort_unless($plan, 404);
            abort_unless($plan->version === (int) $data['version'] && in_array($plan->status, ['draft', 'changes_requested'], true), 409, 'Plan périmé ou non modifiable.');
            $revision = (int) DB::table('action_plan_versions')->where('plan_id', $id)->max('revision') + 1;
            $snapshot = ['title' => trim($data['title']), 'objective' => trim($data['objective']), 'starts_on' => $data['starts_on'],
                'ends_on' => $data['ends_on'], 'owner_id' => (int) $data['owner_id']];
            DB::table('action_plan_versions')->insert(['plan_id' => $id, 'revision' => $revision, 'status' => 'draft',
                'snapshot' => json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), 'created_by' => $request->user()->id,
                'created_at' => now(), 'updated_at' => now()]);
            DB::table('action_plans')->where('id', $id)->update(['title' => $snapshot['title'], 'objective' => $snapshot['objective'],
                'starts_on' => $snapshot['starts_on'], 'ends_on' => $snapshot['ends_on'], 'owner_id' => $snapshot['owner_id'],
                'status' => 'draft', 'version' => $plan->version + 1, 'updated_at' => now()]);
            return response()->json(['data' => DB::table('action_plans')->where('id', $id)->first(), 'revision' => $revision]);
        });
    }

    public function submitPlan(Request $request, int $id): JsonResponse
    {
        $office = $this->office($request, true);
        $data = $request->validate(['version' => 'required|integer|min:1', 'confirmed' => 'required|accepted']);
        return DB::transaction(function () use ($request, $office, $id, $data) {
            $plan = DB::table('action_plans')->where('officine_id', $office)->where('id', $id)->lockForUpdate()->first(); abort_unless($plan, 404);
            abort_unless($plan->version === (int) $data['version'] && $plan->status === 'draft', 409, 'Plan périmé ou non modifiable.');
            DB::table('action_plans')->where('id', $id)->update(['status' => 'submitted', 'version' => $plan->version + 1, 'updated_at' => now()]);
            $revision = DB::table('action_plan_versions')->where('plan_id', $id)->where('status', 'draft')->orderByDesc('revision')->lockForUpdate()->first();
            abort_unless($revision, 409, 'Aucun brouillon de plan à soumettre.');
            DB::table('action_plan_versions')->where('id', $revision->id)->update(['status' => 'submitted', 'submitted_at' => now(), 'updated_at' => now()]);
            return response()->json(['status' => 'submitted', 'version' => $plan->version + 1]);
        });
    }

    public function decidePlan(Request $request, int $id): JsonResponse
    {
        $office = $this->office($request, true);
        abort_unless((bool) $request->attributes->get('officine.is_admin'), 403, 'Décision réservée à l’administrateur actif de l’officine.');
        $data = $request->validate(['version' => 'required|integer|min:1', 'decision' => 'required|in:approve,request_changes',
            'reason' => 'required_if:decision,request_changes|nullable|string|max:2000', 'confirmed' => 'required|accepted']);
        return DB::transaction(function () use ($request, $office, $id, $data) {
            $plan = DB::table('action_plans')->where('officine_id', $office)->where('id', $id)->lockForUpdate()->first(); abort_unless($plan, 404);
            abort_unless($plan->version === (int) $data['version'] && $plan->status === 'submitted', 409, 'Plan périmé ou non soumis.');
            $status = $data['decision'] === 'approve' ? 'approved' : 'changes_requested';
            DB::table('action_plans')->where('id', $id)->update(['status' => $status, 'version' => $plan->version + 1, 'updated_at' => now()]);
            $revision = DB::table('action_plan_versions')->where('plan_id', $id)->where('status', 'submitted')->orderByDesc('revision')->lockForUpdate()->first();
            abort_unless($revision, 409, 'Aucune version soumise à décider.');
            DB::table('action_plan_versions')->where('id', $revision->id)->update(['status' => $status,
                'decision' => $data['decision'], 'decision_reason' => $data['reason'] ?? null, 'decided_by' => $request->user()->id, 'decided_at' => now(), 'updated_at' => now()]);
            return response()->json(['status' => $status, 'version' => $plan->version + 1]);
        });
    }

    public function createAction(Request $request): JsonResponse
    {
        $office = $this->office($request, true);
        $data = $request->validate(['title' => 'required|string|max:180', 'description' => 'required|string|max:5000',
            'request_key' => 'required|string|min:16|max:80|regex:/^[A-Za-z0-9-]+$/',
            'owner_id' => 'required|integer|min:1', 'due_date' => 'required|date_format:Y-m-d', 'priority' => 'required|in:low,normal,high',
            'plan_id' => 'nullable|integer|min:1', 'resources' => 'nullable|array|max:30', 'resources.*' => 'string|max:500',
            'evidence_expected' => 'nullable|string|max:2000', 'effectiveness_criteria' => 'required|string|min:8|max:2000',
            'sources' => 'required|array|min:1|max:20', 'sources.*.type' => 'required|in:finding,mission,document,risk,complaint,reclamation',
            'sources.*.id' => 'nullable|integer|min:1', 'sources.*.label' => 'nullable|string|max:220', 'confirmed' => 'required|accepted']);
        $this->owner($office, (int) $data['owner_id']);
        if (!empty($data['plan_id'])) abort_unless(DB::table('action_plans')->where('officine_id', $office)->where('id', $data['plan_id'])->where('status', 'approved')->exists(), 422, 'Le plan doit être approuvé et appartenir à cette officine.');
        $fingerprint = hash('sha256', json_encode(collect($data)->except(['request_key', 'confirmed'])->all(), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
        $result = DB::transaction(function () use ($request, $office, $data, $fingerprint) {
            DB::table('officines')->where('id', $office)->lockForUpdate()->firstOrFail();
            $existing = DB::table('module4_actions')->where('officine_id', $office)->where('request_key', $data['request_key'])->first();
            if ($existing) {
                abort_unless(hash_equals((string) $existing->request_fingerprint, $fingerprint), 409, 'Clé de création déjà utilisée avec un contenu différent.');
                return ['id' => (int) $existing->id, 'created' => false];
            }
            $id = DB::table('module4_actions')->insertGetId(['officine_id' => $office, 'plan_id' => $data['plan_id'] ?? null,
                'title' => trim($data['title']), 'description' => trim($data['description']), 'owner_id' => $data['owner_id'],
                'due_date' => $data['due_date'], 'priority' => $data['priority'], 'resources' => json_encode($data['resources'] ?? []),
                'evidence_expected' => $data['evidence_expected'] ?? null, 'effectiveness_criteria' => $data['effectiveness_criteria'] ?? null,
                'status' => 'open', 'version' => 1, 'request_key' => $data['request_key'], 'request_fingerprint' => $fingerprint,
                'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            $this->addSources($request, $office, $id, $data['sources']);
            $this->logEvent($request, $office, $id, 'created', ['status' => 'open']);
            return ['id' => $id, 'created' => true];
        });
        return response()->json($this->detailData($office, $result['id']), $result['created'] ? 201 : 200);
    }

    private function detailData(int $office, int $id): array
    {
        $row = $this->action($office, $id);
        $row->sources = DB::table('module4_action_sources')->where('officine_id', $office)->where('action_id', $id)->get();
        $row->evidence = DB::table('module4_action_evidence as e')->join('documents as d', 'd.id', '=', 'e.document_id')->where('e.officine_id', $office)->where('e.action_id', $id)->get(['e.document_id', 'e.document_version', 'd.title']);
        $row->events = DB::table('module4_action_events')->where('officine_id', $office)->where('action_id', $id)->orderBy('id')->get();
        $row->effectiveness_reviews = DB::table('module4_effectiveness_reviews')->where('officine_id', $office)->where('action_id', $id)->orderByDesc('id')->get();
        $row->overdue = $row->due_date < now()->toDateString() && !in_array($row->status, ['closed', 'cancelled'], true);
        return ['data' => $row];
    }

    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json($this->detailData($this->office($request), $id));
    }

    public function updateAction(Request $request, int $id): JsonResponse
    {
        $office = $this->office($request, true);
        $data = $request->validate(['version' => 'required|integer|min:1', 'title' => 'required|string|max:180', 'description' => 'required|string|max:5000',
            'owner_id' => 'required|integer|min:1', 'due_date' => 'required|date_format:Y-m-d', 'priority' => 'required|in:low,normal,high',
            'resources' => 'nullable|array|max:30', 'resources.*' => 'string|max:500', 'evidence_expected' => 'nullable|string|max:2000',
            'effectiveness_criteria' => 'nullable|string|max:2000']);
        $this->owner($office, (int) $data['owner_id']);
        return DB::transaction(function () use ($request, $office, $id, $data) {
            $row = $this->action($office, $id, true);
            abort_unless($row->version === (int) $data['version'] && in_array($row->status, ['open', 'in_progress'], true), 409, 'Action périmée ou non modifiable.');
            $version = $row->version + 1;
            DB::table('module4_actions')->where('id', $id)->update(['title' => trim($data['title']), 'description' => trim($data['description']),
                'owner_id' => $data['owner_id'], 'due_date' => $data['due_date'], 'priority' => $data['priority'],
                'resources' => json_encode($data['resources'] ?? []), 'evidence_expected' => $data['evidence_expected'] ?? null,
                'effectiveness_criteria' => $data['effectiveness_criteria'] ?? null, 'version' => $version, 'updated_at' => now()]);
            $this->logEvent($request, $office, $id, 'updated', ['version' => $version]);
            return response()->json(['data' => $this->detailData($office, $id)]);
        });
    }

    public function transition(Request $request, int $id, string $transition): JsonResponse
    {
        $office = $this->office($request, true);
        abort_unless(in_array($transition, ['start', 'complete', 'verify', 'reopen', 'report', 'close'], true), 404);
        $rules = ['version' => 'required|integer|min:1', 'confirmed' => 'required|accepted'];
        if ($transition === 'verify') $rules += ['decision' => 'required|in:accept,rework', 'reason' => 'nullable|string|max:2000'];
        if ($transition === 'report') $rules += ['new_due_date' => 'required|date_format:Y-m-d|after:today', 'reason' => 'required|string|min:8|max:2000'];
        if ($transition === 'close') $rules += ['reason' => 'required|string|min:8|max:2000'];
        $data = $request->validate($rules);
        if (in_array($transition, ['verify', 'close'], true)) abort_unless((bool) $request->attributes->get('officine.is_admin'), 403, 'Vérification réservée à un administrateur actif.');
        return DB::transaction(function () use ($request, $office, $id, $transition, $data) {
            $row = $this->action($office, $id, true);
            abort_unless($row->version === (int) $data['version'], 409, 'Version d’action périmée.');
            $next = $row->version + 1; $status = $row->status; $fields = ['version' => $next, 'updated_at' => now()];
            switch ($transition) {
                case 'start': abort_unless($status === 'open', 409); $status = 'in_progress'; break;
                case 'complete': abort_unless(in_array($status, ['open', 'in_progress'], true), 409); $status = 'completed'; $fields['completed_at'] = now(); break;
                case 'verify': abort_unless($status === 'completed', 409); $status = $data['decision'] === 'accept' ? 'verified' : 'rework'; $fields['verified_at'] = now(); break;
                case 'reopen': abort_unless(in_array($status, ['rework', 'verified'], true), 409); $status = 'in_progress'; $fields['completed_at'] = null; break;
                case 'report': abort_unless(!in_array($status, ['closed', 'cancelled'], true), 409); $fields['due_date'] = $data['new_due_date']; break;
                case 'close':
                    abort_unless(in_array($status, ['verified', 'completed'], true), 409, 'L’action doit être réalisée puis vérifiée avant clôture.');
                    abort_unless(DB::table('module4_action_evidence')->where('officine_id', $office)->where('action_id', $id)->exists(), 409, 'Une preuve documentaire est requise avant clôture.');
                    $review = DB::table('module4_effectiveness_reviews')->where('officine_id', $office)->where('action_id', $id)->latest('id')->first();
                    abort_unless($review && $review->effective, 409, 'Une mesure d’efficacité positive est requise avant clôture.');
                    $status = 'closed'; $fields['closed_at'] = now(); break;
            }
            $fields['status'] = $status;
            DB::table('module4_actions')->where('id', $id)->update($fields);
            if ($transition === 'report') $this->logEvent($request, $office, $id, 'deadline_reported', ['old_due_date' => $row->due_date, 'new_due_date' => $data['new_due_date'], 'reason' => $data['reason'], 'version' => $next]);
            else $this->logEvent($request, $office, $id, $transition, ['status' => $status, 'reason' => $data['reason'] ?? null, 'version' => $next]);
            return response()->json(['status' => $status, 'version' => $next, 'due_date' => $fields['due_date'] ?? $row->due_date]);
        });
    }

    public function addEvidence(Request $request, int $id): JsonResponse
    {
        $office = $this->office($request, true);
        $data = $request->validate(['version' => 'required|integer|min:1', 'document_id' => 'required|integer|min:1', 'document_version' => 'required|integer|min:1', 'confirmed' => 'required|accepted']);
        return DB::transaction(function () use ($request, $office, $id, $data) {
            $row = $this->action($office, $id, true);
            abort_unless($row->version === (int) $data['version'] && !in_array($row->status, ['closed', 'cancelled'], true), 409);
            $approved = DB::table('document_approvals')->where('officine_id', $office)->where('document_id', $data['document_id'])->where('version', $data['document_version'])->exists();
            abort_unless($approved, 422, 'La preuve doit être une version approuvée d’un document de cette officine.');
            DB::table('module4_action_evidence')->insertOrIgnore(['officine_id' => $office, 'action_id' => $id, 'document_id' => $data['document_id'],
                'document_version' => $data['document_version'], 'added_by' => $request->user()->id, 'created_at' => now()]);
            DB::table('module4_actions')->where('id', $id)->update(['version' => $row->version + 1, 'updated_at' => now()]);
            $this->logEvent($request, $office, $id, 'evidence_added', ['document_id' => $data['document_id'], 'document_version' => $data['document_version']]);
            return response()->json($this->detailData($office, $id));
        });
    }

    public function effectiveness(Request $request, int $id): JsonResponse
    {
        $office = $this->office($request, true);
        $data = $request->validate(['version' => 'required|integer|min:1', 'effective' => 'required|boolean', 'finding' => 'required|string|min:8|max:3000', 'confirmed' => 'required|accepted']);
        return DB::transaction(function () use ($request, $office, $id, $data) {
            $row = $this->action($office, $id, true);
            abort_unless($row->version === (int) $data['version'] && in_array($row->status, ['verified', 'completed', 'rework'], true), 409);
            DB::table('module4_effectiveness_reviews')->insert(['officine_id' => $office, 'action_id' => $id, 'reviewed_by' => $request->user()->id,
                'action_version' => $row->version, 'effective' => $data['effective'], 'finding' => trim($data['finding']), 'reviewed_at' => now()]);
            $status = $data['effective'] ? $row->status : 'rework';
            DB::table('module4_actions')->where('id', $id)->update(['status' => $status, 'version' => $row->version + 1, 'updated_at' => now()]);
            $this->logEvent($request, $office, $id, 'effectiveness_reviewed', ['effective' => (bool) $data['effective'], 'version' => $row->version + 1]);
            return response()->json(['status' => $status, 'version' => $row->version + 1]);
        });
    }

    /** Import an approved M2 plan once; M4 records become the only executable actions. */
    public function importMissionPlan(Request $request, int $missionId): JsonResponse
    {
        $office = $this->office($request, true);
        $mission = DB::table('support_missions as m')->join('support_requests as r', 'r.id', '=', 'm.support_request_id')->where('r.officine_id', $office)->where('m.id', $missionId)->select('m.*')->first();
        abort_unless($mission && (bool) $request->attributes->get('officine.is_admin'), 404);
        $version = DB::table('support_plans as p')->join('support_plan_versions as v', 'v.plan_id', '=', 'p.id')->where('p.mission_id', $missionId)->where('p.status', 'approved')->where('v.state', 'approved')->orderByDesc('v.revision')->first(['p.id as plan_id', 'v.revision', 'v.snapshot']);
        abort_unless($version, 409, 'Aucun plan M2 approuvé à intégrer.');
        $snapshot = json_decode($version->snapshot, true, flags: JSON_THROW_ON_ERROR);
        return DB::transaction(function () use ($request, $office, $mission, $version, $snapshot, $missionId) {
            DB::table('support_missions')->where('id', $missionId)->lockForUpdate()->first();
            $existing = DB::table('action_plans')->where('officine_id', $office)->where('source_type', 'mission_plan')->where('source_id', $missionId)->first();
            if ($existing) return response()->json(['data' => $existing, 'created' => false]);
            $planId = DB::table('action_plans')->insertGetId(['officine_id' => $office, 'reference' => 'M2-'.strtoupper(Str::random(8)),
                'title' => $snapshot['title'], 'objective' => implode("\n", $snapshot['objectives'] ?? []), 'starts_on' => $snapshot['starts_on'], 'ends_on' => $snapshot['ends_on'],
                'owner_id' => $request->user()->id, 'status' => 'approved', 'version' => 1, 'source_type' => 'mission_plan', 'source_id' => $missionId,
                'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('action_plan_versions')->insert(['plan_id' => $planId, 'revision' => 1, 'status' => 'approved', 'snapshot' => json_encode(['m2_plan_id' => $version->plan_id, 'revision' => $version->revision, 'snapshot' => $snapshot]),
                'created_by' => $request->user()->id, 'decided_by' => $request->user()->id, 'decision' => 'imported', 'decided_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
            foreach ($snapshot['items'] ?? [] as $item) {
                $owner = DB::table('officine_user as membership')->join('users', 'users.id', '=', 'membership.user_id')
                    ->where('membership.officine_id', $office)->where('membership.is_active', true)
                    ->whereRaw('LOWER(users.name) = LOWER(?)', [trim($item['owner'])])->value('users.id');
                abort_unless($owner, 422, 'Le responsable « '.$item['owner'].' » du plan M2 ne correspond pas à un membre actif. Affectez un membre de l’officine avant l’intégration.');
                $actionId = DB::table('module4_actions')->insertGetId(['officine_id' => $office, 'plan_id' => $planId, 'title' => Str::limit($item['expected_result'], 180),
                    'description' => trim(($item['expected_result'] ?? '')."\n".($item['comment'] ?? '')), 'owner_id' => $owner,
                    'due_date' => $item['due_date'], 'priority' => in_array($item['priority'], ['low', 'high'], true) ? $item['priority'] : 'normal',
                    'resources' => json_encode([]), 'evidence_expected' => $item['evidence_expected'] ?? null, 'effectiveness_criteria' => $item['effectiveness_criteria'],
                    'status' => 'open', 'version' => 1, 'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
                $this->addSources($request, $office, $actionId, array_filter([
                    ['type' => 'mission', 'id' => $missionId, 'label' => $mission->title],
                    !empty($item['source_finding_id']) ? ['type' => 'finding', 'id' => $item['source_finding_id']] : null,
                ]));
                $this->logEvent($request, $office, $actionId, 'imported_from_m2', ['mission_id' => $missionId, 'plan_revision' => $version->revision]);
            }
            Outbox::office($office, 'm4-import-m2-plan:'.$missionId, 'Plan M2 intégré au suivi des actions', 'Un plan approuvé a été repris dans le registre M4. Cette notification est préparée dans l’outbox.');
            return response()->json(['data' => DB::table('action_plans')->where('id', $planId)->first(), 'created' => true], 201);
        });
    }
}

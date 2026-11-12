<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Qualite\Models\ContinuityExercise;
use App\Modules\Qualite\Models\ContinuityScenario;
use App\Modules\Qualite\Models\RiskActionLink;
use App\Modules\Qualite\Models\RiskAndOpportunity;
use App\Modules\Qualite\Models\RiskAssessment;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class Module7RisqueContinuiteController extends Controller
{
    protected function getOfficineId(Request $request): int
    {
        $tenantId = app()->bound('tenant.officine_id') ? app('tenant.officine_id') : null;
        $headerId = $request->header('X-Officine-ID');
        return (int) ($tenantId ?? $headerId ?? 1);
    }

    protected function checkPermission(Request $request, string $permission): void
    {
        $isAdmin = (bool) $request->attributes->get('officine.is_admin', false);
        if ($isAdmin) {
            return;
        }

        $perms = $request->attributes->get('officine.permissions', []);
        abort_unless(in_array($permission, $perms, true) || in_array('admin', $perms, true), 403, "Permission {$permission} requise.");
    }

    /**
     * Indicateurs consolidés Risques, Opportunités & PCA (CDC 6)
     */
    public function overview(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        $risksQuery = RiskAndOpportunity::where('officine_id', $officineId);
        $totalRisks = (clone $risksQuery)->where('type', 'risk')->count();
        $totalOpportunities = (clone $risksQuery)->where('type', 'opportunity')->count();

        // Répartition par criticité actuelle (basée sur l'évaluation résiduelle si existante, sinon initiale)
        $assessments = DB::table('risks_and_opportunities as r')
            ->leftJoin('risk_assessments as a_res', function ($join) {
                $join->on('a_res.risk_id', '=', 'r.id')->where('a_res.assessment_type', '=', 'residual');
            })
            ->leftJoin('risk_assessments as a_init', function ($join) {
                $join->on('a_init.risk_id', '=', 'r.id')->where('a_init.assessment_type', '=', 'initial');
            })
            ->where('r.officine_id', $officineId)
            ->where('r.type', 'risk')
            ->selectRaw("COALESCE(a_res.criticality_level, a_init.criticality_level, 'non_evalue') as crit_level, count(*) as count")
            ->groupBy('crit_level')
            ->pluck('count', 'crit_level')
            ->toArray();

        $byCriticality = [
            'critique' => $assessments['critique'] ?? 0,
            'eleve' => $assessments['eleve'] ?? 0,
            'modere' => $assessments['modere'] ?? 0,
            'faible' => $assessments['faible'] ?? 0,
            'non_evalue' => $assessments['non_evalue'] ?? 0,
        ];

        // Indicateurs PCA
        $scenariosCount = ContinuityScenario::where('officine_id', $officineId)->where('status', 'active')->count();
        $exercisesCount = ContinuityExercise::whereHas('scenario', function ($q) use ($officineId) {
            $q->where('officine_id', $officineId);
        })->count();

        $avgRto = ContinuityScenario::where('officine_id', $officineId)->avg('rto_hours');

        return response()->json([
            'status' => 'success',
            'indicators' => [
                'total_risks' => $totalRisks,
                'total_opportunities' => $totalOpportunities,
                'by_criticality' => $byCriticality,
                'pca_active_scenarios' => $scenariosCount,
                'pca_exercises_conducted' => $exercisesCount,
                'pca_average_rto_hours' => $avgRto ? round((float) $avgRto, 1) : null,
                'definition' => 'Module 07 : Cartographie des risques, cotation matricielle et Plan de Continuité d’Activité (PCA)',
                'updated_at' => Carbon::now()->toIso8601String(),
            ],
        ]);
    }

    // ==========================================
    // RISQUES & OPPORTUNITÉS
    // ==========================================

    public function risksIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        $query = RiskAndOpportunity::where('officine_id', $officineId)
            ->with(['owner:id,name', 'initialAssessment', 'residualAssessment', 'actionLinks']);

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($proc = $request->input('process_scope')) {
            $query->where('process_scope', $proc);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'ilike', "%{$search}%")
                    ->orWhere('title', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        $items = $query->orderByDesc('id')->paginate($request->integer('per_page', 25));

        return response()->json([
            'status' => 'success',
            'data' => $items,
        ]);
    }

    public function createRisk(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'type' => 'required|in:risk,opportunity',
            'process_scope' => 'required|string|max:100',
            'title' => 'required|string|max:180',
            'description' => 'required|string|max:5000',
            'causes' => 'nullable|string|max:2000',
            'consequences' => 'nullable|string|max:2000',
            'owner_id' => 'required|exists:users,id',
            'initial_probability' => 'nullable|integer|min:1|max:4',
            'initial_impact' => 'nullable|integer|min:1|max:4',
            'rationale' => 'nullable|string|max:1000',
        ]);

        $prefix = $validated['type'] === 'risk' ? 'RSK' : 'OPP';
        $year = Carbon::now()->format('Y');
        $count = RiskAndOpportunity::where('officine_id', $officineId)
            ->where('type', $validated['type'])
            ->whereYear('created_at', $year)
            ->count() + 1;
        $reference = sprintf('%s-%s-%03d', $prefix, $year, $count);

        $userId = $request->user()?->id ?? $validated['owner_id'];

        return DB::transaction(function () use ($officineId, $reference, $validated, $userId) {
            $risk = RiskAndOpportunity::create([
                'officine_id' => $officineId,
                'reference' => $reference,
                'type' => $validated['type'],
                'process_scope' => trim($validated['process_scope']),
                'title' => trim($validated['title']),
                'description' => trim($validated['description']),
                'causes' => $validated['causes'] ?? null,
                'consequences' => $validated['consequences'] ?? null,
                'owner_id' => $validated['owner_id'],
                'status' => (!empty($validated['initial_probability']) && !empty($validated['initial_impact'])) ? 'evaluated' : 'identified',
                'version' => 1,
                'created_by' => $userId,
            ]);

            // Cotation initiale brute si renseignée
            if (!empty($validated['initial_probability']) && !empty($validated['initial_impact'])) {
                $calc = RiskAssessment::calculateScoreAndLevel($validated['initial_probability'], $validated['initial_impact']);
                RiskAssessment::create([
                    'risk_id' => $risk->id,
                    'assessment_type' => 'initial',
                    'probability' => $validated['initial_probability'],
                    'impact' => $validated['initial_impact'],
                    'score' => $calc['score'],
                    'criticality_level' => $calc['criticality_level'],
                    'grid_version' => '1.0',
                    'rationale' => $validated['rationale'] ?? null,
                    'evaluated_by' => $userId,
                    'evaluated_at' => Carbon::now(),
                ]);
            }

            return response()->json([
                'status' => 'success',
                'message' => "Élément {$risk->reference} enregistré avec succès.",
                'data' => $risk->load(['owner:id,name', 'initialAssessment']),
            ], 201);
        });
    }

    public function showRisk(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        $risk = RiskAndOpportunity::where('officine_id', $officineId)
            ->where('id', $id)
            ->with([
                'owner:id,name,email',
                'creator:id,name,email',
                'assessments.evaluator:id,name',
                'initialAssessment',
                'residualAssessment',
                'actionLinks',
            ])
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => $risk,
        ]);
    }

    public function updateRisk(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $risk = RiskAndOpportunity::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:180',
            'description' => 'sometimes|required|string|max:5000',
            'causes' => 'nullable|string|max:2000',
            'consequences' => 'nullable|string|max:2000',
            'process_scope' => 'sometimes|required|string|max:100',
            'owner_id' => 'sometimes|required|exists:users,id',
            'status' => 'sometimes|required|in:identified,evaluated,mitigated,accepted,closed',
            'version' => 'required|integer',
        ]);

        if ($validated['version'] !== $risk->version) {
            abort(409, 'Conflit de modification concurrente. Veuillez recharger la fiche.');
        }

        $risk->fill($validated);
        $risk->version += 1;
        $risk->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Fiche mise à jour.',
            'data' => $risk->fresh(['owner', 'initialAssessment', 'residualAssessment']),
        ]);
    }

    /**
     * Évaluation matricielle (CDC 3.2 & 3.4) : Initial (brut) vs Résiduel (net)
     * Calcul obligatoire : score = probabilité (1-4) x gravité/pertinence (1-4)
     */
    public function assessRisk(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $risk = RiskAndOpportunity::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'assessment_type' => 'required|in:initial,residual',
            'probability' => 'required|integer|min:1|max:4',
            'impact' => 'required|integer|min:1|max:4',
            'rationale' => 'nullable|string|max:1500',
        ]);

        $userId = $request->user()?->id ?? 1;

        $calc = RiskAssessment::calculateScoreAndLevel($validated['probability'], $validated['impact']);

        $assessment = RiskAssessment::updateOrCreate(
            [
                'risk_id' => $risk->id,
                'assessment_type' => $validated['assessment_type'],
            ],
            [
                'probability' => $validated['probability'],
                'impact' => $validated['impact'],
                'score' => $calc['score'],
                'criticality_level' => $calc['criticality_level'],
                'grid_version' => '1.0',
                'rationale' => $validated['rationale'] ?? null,
                'evaluated_by' => $userId,
                'evaluated_at' => Carbon::now(),
            ]
        );

        if ($validated['assessment_type'] === 'residual' && $risk->status !== 'closed') {
            $risk->status = 'mitigated';
            $risk->version += 1;
            $risk->save();
        } elseif ($validated['assessment_type'] === 'initial' && $risk->status === 'identified') {
            $risk->status = 'evaluated';
            $risk->version += 1;
            $risk->save();
        }

        return response()->json([
            'status' => 'success',
            'message' => "Évaluation {$validated['assessment_type']} enregistrée (Score: {$calc['score']}, Niveau: {$calc['criticality_level']}).",
            'data' => $assessment->load(['evaluator:id,name']),
        ]);
    }

    /**
     * Passerelle 1-clic : Création d'une action CAPA de maîtrise dans Module 04 (CDC 3.3 & 4)
     */
    public function createCapaAction(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $risk = RiskAndOpportunity::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'title' => 'required|string|max:180',
            'description' => 'required|string|max:5000',
            'owner_id' => 'required|exists:users,id',
            'due_date' => 'required|date',
            'priority' => 'nullable|in:low,normal,high',
            'mitigation_strategy' => 'required|in:reduce,avoid,transfer,accept',
            'effectiveness_criteria' => 'required|string|min:8|max:2000',
        ]);

        $userId = $request->user()?->id ?? 1;

        return DB::transaction(function () use ($officineId, $risk, $validated, $userId) {
            $requestKey = 'RISK-CAPA-' . $risk->id . '-' . Str::random(16);
            $actionId = DB::table('module4_actions')->insertGetId([
                'officine_id' => $officineId,
                'plan_id' => null,
                'title' => trim($validated['title']),
                'description' => trim($validated['description']),
                'owner_id' => $validated['owner_id'],
                'due_date' => $validated['due_date'],
                'priority' => $validated['priority'] ?? 'high',
                'resources' => json_encode([
                    'source_type' => 'risk',
                    'source_id' => $risk->id,
                    'reference' => $risk->reference,
                    'strategy' => $validated['mitigation_strategy'],
                ]),
                'evidence_expected' => "Preuve de mise en œuvre mesure de maîtrise {$risk->reference}",
                'effectiveness_criteria' => trim($validated['effectiveness_criteria']),
                'status' => 'open',
                'version' => 1,
                'request_key' => $requestKey,
                'request_fingerprint' => hash('sha256', $requestKey . $validated['title']),
                'created_by' => $userId,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);

            DB::table('module4_action_sources')->insert([
                'officine_id' => $officineId,
                'action_id' => $actionId,
                'source_type' => 'risk',
                'source_id' => $risk->id,
                'label' => "Maîtrise du risque {$risk->reference} ({$risk->process_scope})",
                'created_by' => $userId,
                'created_at' => Carbon::now(),
            ]);

            DB::table('module4_action_events')->insert([
                'officine_id' => $officineId,
                'action_id' => $actionId,
                'actor_id' => $userId,
                'event' => 'created',
                'snapshot' => json_encode(['status' => 'open', 'source' => 'risk', 'reference' => $risk->reference]),
                'created_at' => Carbon::now(),
            ]);

            $link = RiskActionLink::create([
                'risk_id' => $risk->id,
                'action_id' => $actionId,
                'mitigation_strategy' => $validated['mitigation_strategy'],
            ]);

            $actionRow = DB::table('module4_actions')->where('id', $actionId)->first();

            return response()->json([
                'status' => 'success',
                'message' => "Action CAPA #{$actionId} enregistrée dans Module 04.",
                'data' => [
                    'action' => $actionRow,
                    'link' => $link,
                ],
            ], 201);
        });
    }

    // ==========================================
    // PLAN DE CONTINUITÉ D'ACTIVITÉ (PCA)
    // ==========================================

    public function scenariosIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        $query = ContinuityScenario::where('officine_id', $officineId)
            ->with(['coordinator:id,name', 'exercises']);

        if ($threat = $request->input('threat_type')) {
            $query->where('threat_type', $threat);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $scenarios = $query->orderBy('id')->get();

        return response()->json([
            'status' => 'success',
            'data' => $scenarios,
        ]);
    }

    public function createScenario(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'title' => 'required|string|max:180',
            'threat_type' => 'required|string|in:coupure_energie,rupture_stock,sinistre_inondation,panne_informatique,indisponibilite_personnel,autre',
            'trigger_events' => 'required|string|max:2000',
            'immediate_actions' => 'required|string|max:4000',
            'alternative_operations' => 'required|string|max:4000',
            'rto_hours' => 'required|integer|min:1|max:72',
            'coordinator_id' => 'required|exists:users,id',
            'crisis_contacts' => 'nullable|array',
            'crisis_contacts.*.role' => 'required|string|max:100',
            'crisis_contacts.*.name' => 'required|string|max:120',
            'crisis_contacts.*.phone' => 'required|string|max:60',
        ]);

        $year = Carbon::now()->format('Y');
        $count = ContinuityScenario::where('officine_id', $officineId)->whereYear('created_at', $year)->count() + 1;
        $reference = sprintf('PCA-%s-%02d', $year, $count);

        $userId = $request->user()?->id ?? $validated['coordinator_id'];

        $scenario = ContinuityScenario::create([
            'officine_id' => $officineId,
            'reference' => $reference,
            'title' => trim($validated['title']),
            'threat_type' => $validated['threat_type'],
            'trigger_events' => trim($validated['trigger_events']),
            'immediate_actions' => trim($validated['immediate_actions']),
            'alternative_operations' => trim($validated['alternative_operations']),
            'rto_hours' => $validated['rto_hours'],
            'coordinator_id' => $validated['coordinator_id'],
            'crisis_contacts' => $validated['crisis_contacts'] ?? [],
            'status' => 'active',
            'version' => 1,
            'created_by' => $userId,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Scénario de continuité {$scenario->reference} créé avec succès.",
            'data' => $scenario->load(['coordinator:id,name']),
        ], 201);
    }

    public function showScenario(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        $scenario = ContinuityScenario::where('officine_id', $officineId)
            ->where('id', $id)
            ->with(['coordinator:id,name,email', 'creator:id,name', 'exercises.conductor:id,name'])
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => $scenario,
        ]);
    }

    public function updateScenario(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $scenario = ContinuityScenario::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:180',
            'trigger_events' => 'sometimes|required|string|max:2000',
            'immediate_actions' => 'sometimes|required|string|max:4000',
            'alternative_operations' => 'sometimes|required|string|max:4000',
            'rto_hours' => 'sometimes|required|integer|min:1|max:72',
            'coordinator_id' => 'sometimes|required|exists:users,id',
            'crisis_contacts' => 'nullable|array',
            'status' => 'sometimes|required|in:draft,active,under_revision,archived',
            'version' => 'required|integer',
        ]);

        if ($validated['version'] !== $scenario->version) {
            abort(409, 'Conflit de modification concurrente. Veuillez recharger le scénario PCA.');
        }

        $scenario->fill($validated);
        $scenario->version += 1;
        $scenario->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Scénario PCA mis à jour.',
            'data' => $scenario->fresh(['coordinator', 'exercises']),
        ]);
    }

    /**
     * Enregistrer un exercice de test / simulation PCA (CDC 3.5 & 7)
     */
    public function logExercise(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $scenario = ContinuityScenario::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'title' => 'required|string|max:180',
            'test_type' => 'required|string|in:simulation,reel,revue_sur_table',
            'exercise_date' => 'required|date',
            'measured_recovery_minutes' => 'nullable|integer|min:1',
            'is_successful' => 'required|boolean',
            'findings' => 'nullable|string|max:3000',
            'improvement_points' => 'nullable|string|max:2000',
        ]);

        $userId = $request->user()?->id ?? 1;

        $exercise = ContinuityExercise::create([
            'scenario_id' => $scenario->id,
            'title' => trim($validated['title']),
            'test_type' => $validated['test_type'],
            'exercise_date' => $validated['exercise_date'],
            'conducted_by' => $userId,
            'measured_recovery_minutes' => $validated['measured_recovery_minutes'] ?? null,
            'is_successful' => (bool) $validated['is_successful'],
            'findings' => $validated['findings'] ?? null,
            'improvement_points' => $validated['improvement_points'] ?? null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Exercice de continuité consigné avec succès.',
            'data' => $exercise->load(['conductor:id,name']),
        ], 201);
    }
}

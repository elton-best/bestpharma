<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Qualite\Models\Inspection;
use App\Modules\Qualite\Models\InspectionActionLink;
use App\Modules\Qualite\Models\InspectionInspector;
use App\Modules\Qualite\Models\InspectionItem;
use App\Modules\Qualite\Models\InspectionProgram;
use App\Modules\Qualite\Models\InspectionReport;
use App\Modules\Qualite\Models\InspectionResponse;
use App\Modules\Qualite\Models\InspectorEvaluation;
use App\Modules\Qualite\Models\QualityAction;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class Module5InspectionController extends Controller
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
     * Indicateurs consolidés et taux de couverture 2 ans (CDC 5 & 6)
     */
    public function overview(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        $now = Carbon::now();
        $twoYearsAgo = Carbon::now()->subYears(2);

        $inspectionsQuery = Inspection::where('officine_id', $officineId);

        // Processus fondamentaux du référentiel BPD ABMed
        $coreProcesses = [
            'Organisation Qualité',
            'Personnel & Habilitations',
            'Locaux & Chaîne du Froid',
            'Approvisionnement & Stockage',
            'Dispensation & Stupéfiants',
        ];

        // Processus inspectés au cours des 24 derniers mois
        $coveredProcesses = Inspection::where('officine_id', $officineId)
            ->whereIn('status', ['completed', 'approved', 'closed'])
            ->where('realized_date', '>=', $twoYearsAgo)
            ->distinct()
            ->pluck('process_scope')
            ->toArray();

        $nbCovered = count(array_intersect($coreProcesses, $coveredProcesses));
        $coverageRate = count($coreProcesses) > 0 ? round(($nbCovered / count($coreProcesses)) * 100, 1) : 0;

        $overdueCount = Inspection::where('officine_id', $officineId)
            ->whereIn('status', ['draft', 'planned', 'in_progress'])
            ->where('planned_date', '<', $now->toDateString())
            ->count();

        $byStatus = [
            'draft' => (clone $inspectionsQuery)->where('status', 'draft')->count(),
            'planned' => (clone $inspectionsQuery)->where('status', 'planned')->count(),
            'in_progress' => (clone $inspectionsQuery)->where('status', 'in_progress')->count(),
            'completed' => (clone $inspectionsQuery)->where('status', 'completed')->count(),
            'approved' => (clone $inspectionsQuery)->where('status', 'approved')->count(),
            'closed' => (clone $inspectionsQuery)->where('status', 'closed')->count(),
        ];

        return response()->json([
            'status' => 'success',
            'indicators' => [
                'total' => (clone $inspectionsQuery)->count(),
                'overdue' => $overdueCount,
                'coverage_rate' => $coverageRate,
                'coverage_label' => "{$nbCovered} / " . count($coreProcesses) . " processus inspectés sur 2 ans",
                'by_status' => $byStatus,
                'definition' => 'Auto-inspections et conformité BPD ABMed (Module 05)',
                'updated_at' => $now->toIso8601String(),
            ],
            'core_processes' => $coreProcesses,
            'covered_processes' => $coveredProcesses,
        ]);
    }

    /**
     * Liste des programmes d'auto-inspection
     */
    public function programs(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        $programs = InspectionProgram::where('officine_id', $officineId)
            ->withCount('inspections')
            ->orderByDesc('year_start')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $programs,
        ]);
    }

    /**
     * Création d'un programme pluriannuel
     */
    public function createProgram(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'title' => 'required|string|max:180',
            'year_start' => 'required|integer|min:2020|max:2050',
            'year_end' => 'required|integer|gte:year_start|max:2055',
            'objective' => 'required|string|max:5000',
        ]);

        $userId = $request->user()?->id ?? 1;

        $program = InspectionProgram::create([
            'officine_id' => $officineId,
            'title' => trim($validated['title']),
            'year_start' => $validated['year_start'],
            'year_end' => $validated['year_end'],
            'objective' => trim($validated['objective']),
            'status' => 'active',
            'version' => 1,
            'created_by' => $userId,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Programme d’auto-inspection créé avec succès.',
            'data' => $program,
        ], 201);
    }

    /**
     * Liste paginée des auto-inspections
     */
    public function index(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        $query = Inspection::where('officine_id', $officineId)
            ->with(['program', 'leadInspector:id,name,email', 'inspectors.user:id,name', 'report']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'ilike', "%{$search}%")
                    ->orWhere('title', 'ilike', "%{$search}%")
                    ->orWhere('process_scope', 'ilike', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($scope = $request->input('process_scope')) {
            $query->where('process_scope', $scope);
        }

        $inspections = $query->orderByDesc('planned_date')
            ->paginate($request->integer('per_page', 25));

        return response()->json([
            'status' => 'success',
            'data' => $inspections,
        ]);
    }

    /**
     * Planifier une auto-inspection (avec contrôle strict d'indépendance CDC 3.1 & 7)
     */
    public function store(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'program_id' => 'nullable|exists:inspection_programs,id',
            'title' => 'required|string|max:180',
            'process_scope' => 'required|string|max:100',
            'scope_description' => 'nullable|string|max:2000',
            'objective' => 'required|string|max:3000',
            'planned_date' => 'required|date',
            'lead_inspector_id' => 'required|exists:users,id',
            'inspectors' => 'nullable|array',
            'inspectors.*.user_id' => 'required|exists:users,id',
            'inspectors.*.role' => 'nullable|string|in:lead,inspector,observer',
            'inspectors.*.regular_service' => 'nullable|string|max:100',
            'inspectors.*.conflict_check_passed' => 'required|boolean',
            'inspectors.*.conflict_notes' => 'nullable|string|max:1000',
        ]);

        // RÈGLE MÉTIER BPD INDÉPENDANCE : Les inspecteurs ne contrôlent pas leur propre travail (CDC 3.1 & 7)
        $inspectorsList = $validated['inspectors'] ?? [
            [
                'user_id' => $validated['lead_inspector_id'],
                'role' => 'lead',
                'regular_service' => null,
                'conflict_check_passed' => true,
                'conflict_notes' => 'Indépendance certifiée par la direction.',
            ]
        ];

        foreach ($inspectorsList as $insp) {
            if (empty($insp['conflict_check_passed'])) {
                abort(422, "Conflit d’indépendance : un inspecteur ne peut pas auditer son propre domaine ou service ({$insp['regular_service']}).");
            }
        }

        $userId = $request->user()?->id ?? $validated['lead_inspector_id'];

        return DB::transaction(function () use ($officineId, $validated, $inspectorsList, $userId) {
            $year = Carbon::parse($validated['planned_date'])->format('Y');
            $count = Inspection::where('officine_id', $officineId)->whereYear('planned_date', $year)->count() + 1;
            $reference = sprintf('INSP-%s-%03d', $year, $count);

            $inspection = Inspection::create([
                'officine_id' => $officineId,
                'program_id' => $validated['program_id'] ?? null,
                'reference' => $reference,
                'title' => trim($validated['title']),
                'process_scope' => trim($validated['process_scope']),
                'scope_description' => $validated['scope_description'] ?? null,
                'objective' => trim($validated['objective']),
                'planned_date' => $validated['planned_date'],
                'lead_inspector_id' => $validated['lead_inspector_id'],
                'status' => 'planned',
                'version' => 1,
                'created_by' => $userId,
            ]);

            // Affectation de l'équipe d'inspection
            foreach ($inspectorsList as $insp) {
                InspectionInspector::create([
                    'inspection_id' => $inspection->id,
                    'user_id' => $insp['user_id'],
                    'role' => $insp['role'] ?? 'inspector',
                    'regular_service' => $insp['regular_service'] ?? null,
                    'conflict_check_passed' => (bool) $insp['conflict_check_passed'],
                    'conflict_notes' => $insp['conflict_notes'] ?? null,
                ]);
            }

            // Génération automatique des points de contrôle BPD pour le processus inspecté
            $this->genererGrilleBpdParDefaut($inspection);

            return response()->json([
                'status' => 'success',
                'message' => "Inspection {$inspection->reference} planifiée avec succès.",
                'data' => $inspection->load(['inspectors.user', 'items']),
            ], 201);
        });
    }

    /**
     * Consultation détaillée d'une auto-inspection
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        $inspection = Inspection::where('officine_id', $officineId)
            ->where('id', $id)
            ->with([
                'program',
                'leadInspector:id,name,email',
                'inspectors.user:id,name,email',
                'items.response',
                'report.approver:id,name,email',
                'evaluations.inspector:id,name',
                'actionLinks.action',
            ])
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => $inspection,
        ]);
    }

    /**
     * Modification d'une inspection (avec contrôle de concurrence optimiste)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $inspection = Inspection::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:180',
            'scope_description' => 'nullable|string|max:2000',
            'objective' => 'sometimes|required|string|max:3000',
            'planned_date' => 'sometimes|required|date',
            'realized_date' => 'nullable|date',
            'version' => 'required|integer',
        ]);

        if ($validated['version'] !== $inspection->version) {
            abort(409, "Conflit de modification concurrente. Veuillez recharger l’inspection.");
        }

        $inspection->fill($validated);
        $inspection->version += 1;
        $inspection->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Inspection mise à jour.',
            'data' => $inspection->fresh(['inspectors.user', 'items']),
        ]);
    }

    /**
     * Transition de statut de l'inspection (start, complete, close)
     */
    public function transition(Request $request, int $id, string $transition): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $inspection = Inspection::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $allowedTransitions = ['start', 'complete', 'close'];
        if (! in_array($transition, $allowedTransitions, true)) {
            abort(422, "Transition '{$transition}' non reconnue.");
        }

        if ($transition === 'start') {
            if (! in_array($inspection->status, ['draft', 'planned'], true)) {
                abort(422, "Impossible de démarrer une inspection au statut '{$inspection->status}'.");
            }
            $inspection->status = 'in_progress';
            $inspection->realized_date = $inspection->realized_date ?? Carbon::now()->toDateString();
        } elseif ($transition === 'complete') {
            if ($inspection->status !== 'in_progress') {
                abort(422, "Seule une inspection en cours peut être marquée réalisée.");
            }
            // Vérifier que des questions ont été évaluées
            $evaluatedCount = InspectionResponse::where('inspection_id', $inspection->id)
                ->where('status', '!=', 'non_evalue')
                ->count();
            if ($evaluatedCount === 0) {
                abort(422, "Veuillez évaluer au moins un point de contrôle avant de clore le déroulement terrain.");
            }
            $inspection->status = 'completed';
        } elseif ($transition === 'close') {
            if ($inspection->status !== 'approved') {
                abort(422, "Seule une inspection dont le rapport est approuvé peut être clôturée.");
            }
            $inspection->status = 'closed';
        }

        $inspection->version += 1;
        $inspection->save();

        return response()->json([
            'status' => 'success',
            'message' => "Statut de l’inspection mis à jour : {$inspection->status}.",
            'data' => $inspection,
        ]);
    }

    /**
     * Saisie / Enregistrement des constats et cotations terrain (CDC 3.3)
     */
    public function saveResponses(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $inspection = Inspection::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'responses' => 'required|array|min:1',
            'responses.*.item_id' => 'required|exists:inspection_items,id',
            'responses.*.status' => 'required|in:conforme,non_conforme,non_applicable,non_evalue',
            'responses.*.observed_facts' => 'nullable|string|max:4000',
            'responses.*.evidence_notes' => 'nullable|string|max:2000',
            'responses.*.finding_type' => 'nullable|in:none,strength,weakness,non_conformity',
        ]);

        $userId = $request->user()?->id ?? $inspection->lead_inspector_id;

        DB::transaction(function () use ($inspection, $validated, $userId) {
            foreach ($validated['responses'] as $resp) {
                InspectionResponse::updateOrCreate(
                    [
                        'inspection_id' => $inspection->id,
                        'item_id' => $resp['item_id'],
                    ],
                    [
                        'status' => $resp['status'],
                        'observed_facts' => $resp['observed_facts'] ?? null,
                        'evidence_notes' => $resp['evidence_notes'] ?? null,
                        'finding_type' => $resp['finding_type'] ?? ($resp['status'] === 'non_conforme' ? 'non_conformity' : 'none'),
                        'evaluated_by' => $userId,
                        'evaluated_at' => Carbon::now(),
                    ]
                );
            }

            if ($inspection->status === 'planned') {
                $inspection->status = 'in_progress';
                $inspection->realized_date = $inspection->realized_date ?? Carbon::now()->toDateString();
                $inspection->version += 1;
                $inspection->save();
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Constats et évaluations enregistrés.',
            'data' => $inspection->load(['items.response']),
        ]);
    }

    /**
     * Soumission du rapport formel d'inspection (CDC 3.4)
     */
    public function submitReport(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $inspection = Inspection::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'methodology' => 'required|string|max:4000',
            'summary_findings' => 'required|string|max:5000',
            'strengths' => 'nullable|string|max:3000',
            'weaknesses' => 'nullable|string|max:3000',
            'conclusions' => 'required|string|max:4000',
            'recommendations' => 'required|string|max:4000',
        ]);

        $reportRef = "RAP-{$inspection->reference}";

        $report = InspectionReport::updateOrCreate(
            ['inspection_id' => $inspection->id],
            [
                'reference' => $reportRef,
                'methodology' => trim($validated['methodology']),
                'summary_findings' => trim($validated['summary_findings']),
                'strengths' => $validated['strengths'] ?? null,
                'weaknesses' => $validated['weaknesses'] ?? null,
                'conclusions' => trim($validated['conclusions']),
                'recommendations' => trim($validated['recommendations']),
                'status' => 'submitted',
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => "Rapport {$report->reference} préparé et soumis pour approbation.",
            'data' => $report,
        ]);
    }

    /**
     * Signature et scellement cryptographique du rapport par le Pharmacien Titulaire (CDC 3.4 & 7)
     */
    public function signReport(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.approve');
        $officineId = $this->getOfficineId($request);

        $inspection = Inspection::where('officine_id', $officineId)->where('id', $id)->firstOrFail();
        $report = InspectionReport::where('inspection_id', $inspection->id)->firstOrFail();

        $validated = $request->validate([
            'decision' => 'required|in:approve,reject',
            'reason' => 'nullable|string|max:1000',
        ]);

        $userId = $request->user()?->id ?? 1;

        if ($validated['decision'] === 'reject') {
            $report->update([
                'status' => 'rejected',
                'rejection_reason' => $validated['reason'] ?? 'Modifications demandées.',
            ]);
            return response()->json([
                'status' => 'success',
                'message' => 'Rapport rejeté avec demande de correction.',
                'data' => $report,
            ]);
        }

        // Scellement cryptographique immuable SHA-256 (CDC 3.4)
        $sealedContent = json_encode([
            'reference' => $report->reference,
            'inspection_id' => $inspection->id,
            'officine_id' => $officineId,
            'methodology' => $report->methodology,
            'conclusions' => $report->conclusions,
            'signed_at' => Carbon::now()->toIso8601String(),
            'approved_by' => $userId,
        ], JSON_THROW_ON_ERROR);

        $sha256 = hash('sha256', $sealedContent);

        $report->update([
            'status' => 'approved',
            'approved_by' => $userId,
            'approved_at' => Carbon::now(),
            'sha256_hash' => $sha256,
            'version' => $report->version + 1,
        ]);

        $inspection->update([
            'status' => 'approved',
            'version' => $inspection->version + 1,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Rapport formel d’auto-inspection approuvé et scellé avec l’empreinte SHA-256.",
            'data' => $report->fresh(['approver']),
        ]);
    }

    /**
     * Passerelle 1-clic vers le Module 04 : création d'une action CAPA depuis un constat (CDC 3.5 & 4)
     */
    public function createAction(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $inspection = Inspection::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'response_id' => 'nullable|exists:inspection_responses,id',
            'title' => 'required|string|max:180',
            'description' => 'required|string|max:5000',
            'owner_id' => 'required|exists:users,id',
            'due_date' => 'required|date',
            'priority' => 'nullable|in:low,normal,high',
            'effectiveness_criteria' => 'required|string|min:8|max:2000',
        ]);

        $userId = $request->user()?->id ?? 1;

        return DB::transaction(function () use ($officineId, $inspection, $validated, $userId) {
            $requestKey = 'INSP-CAPA-' . $inspection->id . '-' . Str::random(16);
            $actionPayload = [
                'officine_id' => $officineId,
                'plan_id' => null,
                'title' => trim($validated['title']),
                'description' => trim($validated['description']),
                'owner_id' => $validated['owner_id'],
                'due_date' => $validated['due_date'],
                'priority' => $validated['priority'] ?? 'normal',
                'resources' => json_encode([
                    'source_type' => 'inspection',
                    'source_id' => $inspection->id,
                    'source_reference' => $inspection->reference,
                ]),
                'evidence_expected' => "Constat auto-inspection {$inspection->reference}",
                'effectiveness_criteria' => trim($validated['effectiveness_criteria']),
                'status' => 'open',
                'version' => 1,
                'request_key' => $requestKey,
                'request_fingerprint' => hash('sha256', $requestKey . $validated['title']),
                'created_by' => $userId,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ];

            // Création de l'action dans module4_actions
            $actionId = DB::table('module4_actions')->insertGetId($actionPayload);

            // Ajout de la source traçable dans module4_action_sources
            DB::table('module4_action_sources')->insert([
                'officine_id' => $officineId,
                'action_id' => $actionId,
                'source_type' => 'finding',
                'source_id' => $inspection->id,
                'label' => "Auto-inspection {$inspection->reference} ({$inspection->process_scope})",
                'created_by' => $userId,
                'created_at' => Carbon::now(),
            ]);

            // Enregistrement de l'événement dans module4_action_events
            DB::table('module4_action_events')->insert([
                'officine_id' => $officineId,
                'action_id' => $actionId,
                'actor_id' => $userId,
                'event' => 'created',
                'snapshot' => json_encode(['status' => 'open', 'source' => 'inspection', 'reference' => $inspection->reference]),
                'created_at' => Carbon::now(),
            ]);

            // Liaison dans inspection_action_links
            $link = InspectionActionLink::create([
                'inspection_id' => $inspection->id,
                'response_id' => $validated['response_id'] ?? null,
                'action_id' => $actionId,
            ]);

            $actionRow = DB::table('module4_actions')->where('id', $actionId)->first();

            return response()->json([
                'status' => 'success',
                'message' => "Action CAPA #{$actionId} créée dans le Module 04 et liée à l’auto-inspection {$inspection->reference}.",
                'data' => [
                    'action' => $actionRow,
                    'link' => $link,
                ],
            ], 201);
        });
    }

    /**
     * Évaluation de la compétence des inspecteurs (CDC 3.5 & BPD)
     */
    public function evaluateInspector(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.approve');
        $officineId = $this->getOfficineId($request);

        $inspection = Inspection::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'inspector_id' => 'required|exists:users,id',
            'methodology_score' => 'required|integer|min:1|max:5',
            'objectivity_score' => 'required|integer|min:1|max:5',
            'reporting_score' => 'required|integer|min:1|max:5',
            'comments' => 'nullable|string|max:2000',
        ]);

        $evaluatorId = $request->user()?->id ?? 1;

        $evaluation = InspectorEvaluation::updateOrCreate(
            [
                'inspection_id' => $inspection->id,
                'inspector_id' => $validated['inspector_id'],
            ],
            [
                'evaluator_id' => $evaluatorId,
                'methodology_score' => $validated['methodology_score'],
                'objectivity_score' => $validated['objectivity_score'],
                'reporting_score' => $validated['reporting_score'],
                'comments' => $validated['comments'] ?? null,
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Évaluation de l’inspecteur enregistrée.',
            'data' => $evaluation->load(['inspector:id,name', 'evaluator:id,name']),
        ]);
    }

    /**
     * Génère la grille de questions types BPD selon le domaine inspecté
     */
    protected function genererGrilleBpdParDefaut(Inspection $inspection): void
    {
        $grilles = [
            'Locaux & Chaîne du Froid' => [
                ['ref' => 'BPD-4.1', 'req' => 'L’enceinte frigorifique (2-8°C) fait l’objet de deux relevés quotidiens horodatés avec thermomètre étalonné.'],
                ['ref' => 'BPD-4.2', 'req' => 'Le plan de nettoyage des locaux et rayonnages est affiché et émargé conformément au calendrier.'],
                ['ref' => 'BPD-4.3', 'req' => 'Le groupe électrogène de secours et l’onduleur sont testés périodiquement avec registre de test.'],
                ['ref' => 'BPD-4.4', 'req' => 'Les zones de stockage garantissent une température ambiante ne dépassant pas 25°C.'],
            ],
            'Personnel & Habilitations' => [
                ['ref' => 'BPD-1.1', 'req' => 'La présence continue d’un pharmacien inscrit à l’Ordre B est assurée pendant toute la durée d’ouverture.'],
                ['ref' => 'BPD-1.2', 'req' => 'Chaque collaborateur dispose d’une fiche de poste signée précisant ses attributions et limites d’autorité.'],
                ['ref' => 'BPD-1.3', 'req' => 'Le plan annuel de formation aux bonnes pratiques de dispensation est exécuté et documenté.'],
            ],
            'Approvisionnement & Stockage' => [
                ['ref' => 'BPD-5.1', 'req' => 'Les livraisons de grossistes font l’objet d’un contrôle d’intégrité et de conformité des dates de péremption.'],
                ['ref' => 'BPD-5.2', 'req' => 'La règle FEFO (First Expired, First Out) est strictement appliquée sur tous les rayonnages.'],
                ['ref' => 'BPD-5.3', 'req' => 'Une zone de quarantaine identifiée accueille les produits périmés, avariés ou rappelés.'],
            ],
            'Dispensation & Stupéfiants' => [
                ['ref' => 'BPD-7.1', 'req' => 'L’analyse pharmaceutique de l’ordonnance est effectuée avant toute délivrance de substance de liste.'],
                ['ref' => 'BPD-7.2', 'req' => 'Le registre officiel des stupéfiants est tenu sans rature, avec balance des stocks à jour.'],
                ['ref' => 'BPD-7.3', 'req' => 'Les conseils de posologie et les mises en garde sont délivrés au patient en toute confidentialité.'],
            ],
            'Organisation Qualité' => [
                ['ref' => 'BPD-2.1', 'req' => 'Le manuel qualité et les procédures opératoires standards (SOP) sont approuvés et accessibles à l’équipe.'],
                ['ref' => 'BPD-2.2', 'req' => 'Toute non-conformité relevée donne lieu à une fiche d’écart et à un plan d’action correctif.'],
                ['ref' => 'BPD-2.3', 'req' => 'Le programme d’auto-inspection couvre la totalité des processus officinaux sur une période de 2 ans.'],
            ],
        ];

        $scope = $inspection->process_scope;
        $items = $grilles[$scope] ?? $grilles['Organisation Qualité'];

        $sort = 1;
        foreach ($items as $it) {
            InspectionItem::create([
                'inspection_id' => $inspection->id,
                'bpd_reference' => $it['ref'],
                'chapter' => $scope,
                'requirement' => $it['req'],
                'sort_order' => $sort++,
            ]);
        }
    }
}

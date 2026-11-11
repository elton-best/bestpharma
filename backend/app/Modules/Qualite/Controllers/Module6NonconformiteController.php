<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Qualite\Models\Complaint;
use App\Modules\Qualite\Models\ComplaintResponse;
use App\Modules\Qualite\Models\NcActionLink;
use App\Modules\Qualite\Models\NcEffectivenessReview;
use App\Modules\Qualite\Models\NcRootCause;
use App\Modules\Qualite\Models\Nonconformity;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class Module6NonconformiteController extends Controller
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
        if (empty($perms)) {
            return;
        }
        abort_unless(in_array($permission, $perms, true) || in_array('admin', $perms, true), 403, "Permission {$permission} requise.");
    }

    /**
     * Indicateurs consolidés Non-conformités & Réclamations (CDC 6)
     */
    public function overview(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        $now = Carbon::now();
        $threeDaysAgo = Carbon::now()->subDays(3);
        $thirtyDaysAgo = Carbon::now()->subDays(30);

        // Indicateurs Réclamations
        $complaintsQuery = Complaint::where('officine_id', $officineId);
        $complaintsTotal = (clone $complaintsQuery)->count();
        $complaintsPending = (clone $complaintsQuery)->whereIn('status', ['received', 'under_review'])->count();

        // Réclamations sans réponse après 72h (CDC 5)
        $complaintsOverdue72h = (clone $complaintsQuery)
            ->where('status', 'received')
            ->where('created_at', '<', $threeDaysAgo)
            ->count();

        // Indicateurs Non-conformités
        $ncQuery = Nonconformity::where('officine_id', $officineId);
        $ncTotal = (clone $ncQuery)->count();
        $ncOpen = (clone $ncQuery)->whereIn('status', ['declared', 'analyzed', 'action_in_progress', 'effectiveness_review'])->count();
        $ncClosed = (clone $ncQuery)->where('status', 'closed')->count();

        // NC non résolues après 30 jours (CDC 5)
        $ncOverdue30d = (clone $ncQuery)
            ->whereIn('status', ['declared', 'analyzed', 'action_in_progress'])
            ->where('detection_date', '<', $thirtyDaysAgo->toDateString())
            ->count();

        // Ventilation par sévérité
        $bySeverity = [
            'critique' => (clone $ncQuery)->where('severity', 'critique')->count(),
            'majeure' => (clone $ncQuery)->where('severity', 'majeure')->count(),
            'mineure' => (clone $ncQuery)->where('severity', 'mineure')->count(),
        ];

        // Ventilation par état
        $byStatus = [
            'declared' => (clone $ncQuery)->where('status', 'declared')->count(),
            'analyzed' => (clone $ncQuery)->where('status', 'analyzed')->count(),
            'action_in_progress' => (clone $ncQuery)->where('status', 'action_in_progress')->count(),
            'effectiveness_review' => (clone $ncQuery)->where('status', 'effectiveness_review')->count(),
            'closed' => $ncClosed,
        ];

        // Taux de clôture / résolution : dénominateur nul donne "Non disponible" (CDC 6)
        $resolutionRateLabel = $ncTotal > 0
            ? round(($ncClosed / $ncTotal) * 100, 1) . '%'
            : 'Non disponible';

        return response()->json([
            'status' => 'success',
            'indicators' => [
                'complaints_total' => $complaintsTotal,
                'complaints_pending' => $complaintsPending,
                'complaints_overdue_72h' => $complaintsOverdue72h,
                'nc_total' => $ncTotal,
                'nc_open' => $ncOpen,
                'nc_closed' => $ncClosed,
                'nc_overdue_30d' => $ncOverdue30d,
                'by_severity' => $bySeverity,
                'by_status' => $byStatus,
                'resolution_rate' => $resolutionRateLabel,
                'definition' => 'Module 06 : Traitement des non-conformités, réclamations et boucle CAPA',
                'updated_at' => $now->toIso8601String(),
            ],
        ]);
    }

    // ==========================================
    // RÉCLAMATIONS (COMPLAINTS)
    // ==========================================

    public function complaintsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        $query = Complaint::where('officine_id', $officineId)
            ->with(['creator:id,name', 'assignedUser:id,name', 'responses', 'nonconformities:id,complaint_id,reference,title,status']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'ilike', "%{$search}%")
                    ->orWhere('title', 'ilike', "%{$search}%")
                    ->orWhere('complainant_name', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($cat = $request->input('category')) {
            $query->where('category', $cat);
        }

        $complaints = $query->orderByDesc('received_date')->paginate($request->integer('per_page', 25));

        return response()->json([
            'status' => 'success',
            'data' => $complaints,
        ]);
    }

    public function createComplaint(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'channel' => 'required|string|in:comptoir,telephone,email,courrier,autre',
            'complainant_type' => 'required|string|in:patient,fournisseur,prescripteur,autre',
            'complainant_name' => 'nullable|string|max:160',
            'complainant_contact' => 'nullable|string|max:160',
            'is_anonymous' => 'nullable|boolean',
            'category' => 'required|string|in:dispensation,produit_defectueux,facturation,accueil_service,retard_livraison,autre',
            'title' => 'required|string|max:180',
            'description' => 'required|string|max:5000',
            'desired_solution' => 'nullable|string|max:2000',
            'received_date' => 'required|date',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $year = Carbon::parse($validated['received_date'])->format('Y');
        $count = Complaint::where('officine_id', $officineId)->whereYear('received_date', $year)->count() + 1;
        $reference = sprintf('REC-%s-%03d', $year, $count);

        $userId = $request->user()?->id ?? 1;

        $complaint = Complaint::create([
            'officine_id' => $officineId,
            'reference' => $reference,
            'channel' => $validated['channel'],
            'complainant_type' => $validated['complainant_type'],
            'complainant_name' => empty($validated['is_anonymous']) ? ($validated['complainant_name'] ?? null) : null,
            'complainant_contact' => empty($validated['is_anonymous']) ? ($validated['complainant_contact'] ?? null) : null,
            'is_anonymous' => (bool) ($validated['is_anonymous'] ?? false),
            'category' => $validated['category'],
            'title' => trim($validated['title']),
            'description' => trim($validated['description']),
            'desired_solution' => $validated['desired_solution'] ?? null,
            'received_date' => $validated['received_date'],
            'status' => 'received',
            'assigned_to' => $validated['assigned_to'] ?? null,
            'version' => 1,
            'created_by' => $userId,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Réclamation {$complaint->reference} enregistrée.",
            'data' => $complaint->load(['creator', 'assignedUser']),
        ], 201);
    }

    public function showComplaint(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        $complaint = Complaint::where('officine_id', $officineId)
            ->where('id', $id)
            ->with([
                'creator:id,name,email',
                'assignedUser:id,name,email',
                'responses.communicator:id,name',
                'nonconformities',
                'actionLinks',
                'effectivenessReviews.reviewer:id,name',
            ])
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => $complaint,
        ]);
    }

    public function updateComplaint(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $complaint = Complaint::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:180',
            'description' => 'sometimes|required|string|max:5000',
            'desired_solution' => 'nullable|string|max:2000',
            'assigned_to' => 'nullable|exists:users,id',
            'status' => 'sometimes|required|string|in:received,under_review,action_required,resolved,closed,rejected',
            'version' => 'required|integer',
        ]);

        if ($validated['version'] !== $complaint->version) {
            abort(409, 'Conflit de modification concurrente. Veuillez recharger la réclamation.');
        }

        $complaint->fill($validated);
        $complaint->version += 1;
        $complaint->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Réclamation mise à jour.',
            'data' => $complaint->fresh(['assignedUser', 'responses']),
        ]);
    }

    public function addComplaintResponse(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $complaint = Complaint::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'response_channel' => 'required|string|in:oral_comptoir,telephone,email,courrier',
            'response_content' => 'required|string|max:4000',
            'decision_type' => 'required|string|in:favorable,partielle,defavorable,sans_suite',
        ]);

        $userId = $request->user()?->id ?? 1;

        return DB::transaction(function () use ($complaint, $validated, $userId) {
            $resp = ComplaintResponse::create([
                'complaint_id' => $complaint->id,
                'response_channel' => $validated['response_channel'],
                'response_content' => trim($validated['response_content']),
                'decision_type' => $validated['decision_type'],
                'communicated_at' => Carbon::now(),
                'communicated_by' => $userId,
            ]);

            if (in_array($complaint->status, ['received', 'under_review'], true)) {
                $complaint->status = 'resolved';
                $complaint->version += 1;
                $complaint->save();
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Réponse apportée au réclamant consignée avec succès.',
                'data' => $resp->load(['communicator:id,name']),
            ], 201);
        });
    }

    /**
     * Conversion 1-clic : Génère une fiche de non-conformité depuis une réclamation sans ressaisie (CDC 7 & 3.3)
     */
    public function createNcFromComplaint(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $complaint = Complaint::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'activity_domain' => 'required|string|in:stockage,dispensation,approvisionnement,chaine_du_froid,hygiene_locaux,stupefiants,organisation_qualite',
            'severity' => 'required|string|in:mineure,majeure,critique',
            'immediate_actions' => 'nullable|string|max:2000',
        ]);

        $year = Carbon::now()->format('Y');
        $count = Nonconformity::where('officine_id', $officineId)->whereYear('detection_date', $year)->count() + 1;
        $reference = sprintf('NC-%s-%03d', $year, $count);

        $userId = $request->user()?->id ?? 1;

        return DB::transaction(function () use ($officineId, $complaint, $validated, $reference, $userId) {
            $nc = Nonconformity::create([
                'officine_id' => $officineId,
                'reference' => $reference,
                'source_type' => 'complaint',
                'complaint_id' => $complaint->id,
                'activity_domain' => $validated['activity_domain'],
                'title' => "Écart issu de réclamation : {$complaint->title}",
                'description' => "Réclamation {$complaint->reference} reçue le {$complaint->received_date->format('d/m/Y')} :\n{$complaint->description}",
                'detection_date' => Carbon::now()->toDateString(),
                'detected_by' => $userId,
                'nature' => 'non_conformite',
                'severity' => $validated['severity'],
                'immediate_actions' => $validated['immediate_actions'] ?? null,
                'status' => 'declared',
                'version' => 1,
                'created_by' => $userId,
            ]);

            $complaint->status = 'action_required';
            $complaint->version += 1;
            $complaint->save();

            return response()->json([
                'status' => 'success',
                'message' => "Fiche de non-conformité {$nc->reference} créée et liée à la réclamation {$complaint->reference}.",
                'data' => $nc,
            ], 201);
        });
    }

    public function closeComplaint(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $complaint = Complaint::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        // Règle CDC 3.5 : clôture refusée si aucun traitement / réponse n'a été consigné
        $hasResponse = ComplaintResponse::where('complaint_id', $complaint->id)->exists();
        if (! $hasResponse && $complaint->status !== 'rejected') {
            abort(422, 'Impossible de clôturer une réclamation sans avoir consigné au préalable la réponse ou la décision apportée.');
        }

        $userId = $request->user()?->id ?? 1;

        $complaint->status = 'closed';
        $complaint->closed_at = Carbon::now();
        $complaint->closed_by = $userId;
        $complaint->version += 1;
        $complaint->save();

        return response()->json([
            'status' => 'success',
            'message' => "Réclamation {$complaint->reference} clôturée.",
            'data' => $complaint,
        ]);
    }

    // ==========================================
    // NON-CONFORMITÉS & ÉCARTS (NONCONFORMITIES)
    // ==========================================

    public function ncIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        $query = Nonconformity::where('officine_id', $officineId)
            ->with(['detector:id,name', 'complaint:id,reference,title', 'rootCause', 'actionLinks']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'ilike', "%{$search}%")
                    ->orWhere('title', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%")
                    ->orWhere('activity_domain', 'ilike', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($sev = $request->input('severity')) {
            $query->where('severity', $sev);
        }

        if ($dom = $request->input('activity_domain')) {
            $query->where('activity_domain', $dom);
        }

        $ncs = $query->orderByDesc('detection_date')->paginate($request->integer('per_page', 25));

        return response()->json([
            'status' => 'success',
            'data' => $ncs,
        ]);
    }

    public function createNc(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'source_type' => 'required|string|in:internal_detection,complaint,audit_inspection,supplier_delivery,temperature_deviation,other',
            'activity_domain' => 'required|string|in:stockage,dispensation,approvisionnement,chaine_du_froid,hygiene_locaux,stupefiants,organisation_qualite',
            'title' => 'required|string|max:180',
            'description' => 'required|string|max:5000',
            'detection_date' => 'required|date',
            'detected_by' => 'required|exists:users,id',
            'nature' => 'required|string|in:ecart,non_conformite',
            'severity' => 'required|string|in:mineure,majeure,critique',
            'immediate_actions' => 'nullable|string|max:2000',
        ]);

        $year = Carbon::parse($validated['detection_date'])->format('Y');
        $count = Nonconformity::where('officine_id', $officineId)->whereYear('detection_date', $year)->count() + 1;
        $reference = sprintf('NC-%s-%03d', $year, $count);

        $userId = $request->user()?->id ?? $validated['detected_by'];

        $nc = Nonconformity::create([
            'officine_id' => $officineId,
            'reference' => $reference,
            'source_type' => $validated['source_type'],
            'activity_domain' => $validated['activity_domain'],
            'title' => trim($validated['title']),
            'description' => trim($validated['description']),
            'detection_date' => $validated['detection_date'],
            'detected_by' => $validated['detected_by'],
            'nature' => $validated['nature'],
            'severity' => $validated['severity'],
            'immediate_actions' => $validated['immediate_actions'] ?? null,
            'status' => 'declared',
            'version' => 1,
            'created_by' => $userId,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Fiche {$nc->reference} déclarée avec succès.",
            'data' => $nc->load(['detector:id,name']),
        ], 201);
    }

    public function showNc(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        $nc = Nonconformity::where('officine_id', $officineId)
            ->where('id', $id)
            ->with([
                'detector:id,name,email',
                'creator:id,name,email',
                'closedByUser:id,name',
                'complaint:id,reference,title,status',
                'rootCause.analyst:id,name',
                'actionLinks',
                'effectivenessReviews.reviewer:id,name',
            ])
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => $nc,
        ]);
    }

    public function updateNc(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $nc = Nonconformity::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:180',
            'description' => 'sometimes|required|string|max:5000',
            'activity_domain' => 'sometimes|required|string|in:stockage,dispensation,approvisionnement,chaine_du_froid,hygiene_locaux,stupefiants,organisation_qualite',
            'nature' => 'sometimes|required|string|in:ecart,non_conformite',
            'severity' => 'sometimes|required|string|in:mineure,majeure,critique',
            'immediate_actions' => 'nullable|string|max:2000',
            'version' => 'required|integer',
        ]);

        if ($validated['version'] !== $nc->version) {
            abort(409, 'Conflit de modification concurrente. Veuillez recharger la fiche de non-conformité.');
        }

        $nc->fill($validated);
        $nc->version += 1;
        $nc->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Non-conformité mise à jour.',
            'data' => $nc->fresh(['detector', 'rootCause']),
        ]);
    }

    /**
     * Analyse des causes racines (5 Pourquoi / 5M Ishikawa) (CDC 3.2)
     */
    public function saveRootCause(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $nc = Nonconformity::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'method' => 'required|string|in:5_why,5m_ishikawa,other',
            'why_1' => 'nullable|string|max:1000',
            'why_2' => 'nullable|string|max:1000',
            'why_3' => 'nullable|string|max:1000',
            'why_4' => 'nullable|string|max:1000',
            'why_5' => 'nullable|string|max:1000',
            'main_cause' => 'required|string|max:2000',
        ]);

        $userId = $request->user()?->id ?? 1;

        $rootCause = NcRootCause::updateOrCreate(
            ['nonconformity_id' => $nc->id],
            [
                'method' => $validated['method'],
                'why_1' => $validated['why_1'] ?? null,
                'why_2' => $validated['why_2'] ?? null,
                'why_3' => $validated['why_3'] ?? null,
                'why_4' => $validated['why_4'] ?? null,
                'why_5' => $validated['why_5'] ?? null,
                'main_cause' => trim($validated['main_cause']),
                'analyzed_by' => $userId,
                'analyzed_at' => Carbon::now(),
            ]
        );

        if ($nc->status === 'declared') {
            $nc->status = 'analyzed';
            $nc->version += 1;
            $nc->save();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Analyse des causes racines enregistrée.',
            'data' => $rootCause->load(['analyst:id,name']),
        ]);
    }

    /**
     * Passerelle 1-clic : Création d'une action CAPA dans Module 04 depuis une NC (CDC 3.4 & 4)
     */
    public function createCapaAction(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $nc = Nonconformity::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'title' => 'required|string|max:180',
            'description' => 'required|string|max:5000',
            'owner_id' => 'required|exists:users,id',
            'due_date' => 'required|date',
            'priority' => 'nullable|in:low,normal,high',
            'effectiveness_criteria' => 'required|string|min:8|max:2000',
        ]);

        $userId = $request->user()?->id ?? 1;

        return DB::transaction(function () use ($officineId, $nc, $validated, $userId) {
            $requestKey = 'NC-CAPA-' . $nc->id . '-' . Str::random(16);
            $actionId = DB::table('module4_actions')->insertGetId([
                'officine_id' => $officineId,
                'plan_id' => null,
                'title' => trim($validated['title']),
                'description' => trim($validated['description']),
                'owner_id' => $validated['owner_id'],
                'due_date' => $validated['due_date'],
                'priority' => $validated['priority'] ?? 'high',
                'resources' => json_encode([
                    'source_type' => 'nonconformity',
                    'source_id' => $nc->id,
                    'reference' => $nc->reference,
                    'severity' => $nc->severity,
                ]),
                'evidence_expected' => "Preuve de traitement de l’écart {$nc->reference}",
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
                'source_type' => 'finding',
                'source_id' => $nc->id,
                'label' => "Non-conformité {$nc->reference} ({$nc->severity})",
                'created_by' => $userId,
                'created_at' => Carbon::now(),
            ]);

            DB::table('module4_action_events')->insert([
                'officine_id' => $officineId,
                'action_id' => $actionId,
                'actor_id' => $userId,
                'event' => 'created',
                'snapshot' => json_encode(['status' => 'open', 'source' => 'nonconformity', 'reference' => $nc->reference]),
                'created_at' => Carbon::now(),
            ]);

            $link = NcActionLink::create([
                'nonconformity_id' => $nc->id,
                'complaint_id' => $nc->complaint_id,
                'action_id' => $actionId,
            ]);

            $nc->status = 'action_in_progress';
            $nc->version += 1;
            $nc->save();

            $actionRow = DB::table('module4_actions')->where('id', $actionId)->first();

            return response()->json([
                'status' => 'success',
                'message' => "Action CAPA #{$actionId} créée dans le Module 04 et reliée à la fiche {$nc->reference}.",
                'data' => [
                    'action' => $actionRow,
                    'link' => $link,
                ],
            ], 201);
        });
    }

    /**
     * Revue d'efficacité (CDC 3.5 & 7)
     */
    public function reviewEffectiveness(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $nc = Nonconformity::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        $validated = $request->validate([
            'criteria_evaluated' => 'required|string|min:8|max:2000',
            'is_effective' => 'required|boolean',
            'observations' => 'nullable|string|max:2000',
            'decision' => 'required|in:approve_closure,require_additional_actions',
        ]);

        $userId = $request->user()?->id ?? 1;

        $review = NcEffectivenessReview::create([
            'nonconformity_id' => $nc->id,
            'complaint_id' => $nc->complaint_id,
            'criteria_evaluated' => trim($validated['criteria_evaluated']),
            'is_effective' => (bool) $validated['is_effective'],
            'observations' => $validated['observations'] ?? null,
            'decision' => $validated['decision'],
            'reviewed_by' => $userId,
            'reviewed_at' => Carbon::now(),
        ]);

        $nc->status = 'effectiveness_review';
        $nc->version += 1;
        $nc->save();

        return response()->json([
            'status' => 'success',
            'message' => "Revue d’efficacité enregistrée (décision : {$review->decision}).",
            'data' => $review->load(['reviewer:id,name']),
        ], 201);
    }

    /**
     * Clôture formelle de la non-conformité (CDC 3.5 & 7)
     */
    public function closeNc(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.approve');
        $officineId = $this->getOfficineId($request);

        $nc = Nonconformity::where('officine_id', $officineId)->where('id', $id)->firstOrFail();

        // Règle CDC 3.5 & 7 : Clôture refusée si aucun contrôle d'efficacité n'est validé comme probant
        $effectiveReview = NcEffectivenessReview::where('nonconformity_id', $nc->id)
            ->where('is_effective', true)
            ->where('decision', 'approve_closure')
            ->latest('id')
            ->first();

        if (! $effectiveReview) {
            abort(422, 'Clôture refusée : une revue d’efficacité favorable et validée est strictement obligatoire avant clôture d’une non-conformité.');
        }

        $userId = $request->user()?->id ?? 1;

        $nc->status = 'closed';
        $nc->closed_at = Carbon::now();
        $nc->closed_by = $userId;
        $nc->version += 1;
        $nc->save();

        return response()->json([
            'status' => 'success',
            'message' => "Non-conformité {$nc->reference} clôturée avec succès suite à revue d'efficacité probante.",
            'data' => $nc->fresh(['closedByUser', 'effectivenessReviews']),
        ]);
    }
}

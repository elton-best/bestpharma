<?php

declare(strict_types=1);

namespace App\Modules\Personnel\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Personnel\Models\Employee;
use App\Modules\Personnel\Models\JobDescription;
use App\Modules\Personnel\Models\LeaveBalance;
use App\Modules\Personnel\Models\LeaveRequest;
use App\Modules\Personnel\Models\PerformanceReview;
use App\Modules\Personnel\Models\Shift;
use App\Modules\Personnel\Models\TrainingAttendance;
use App\Modules\Personnel\Models\TrainingPlan;
use App\Modules\Personnel\Models\TrainingSession;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class Module8PersonnelFormationController extends Controller
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
        abort_unless(
            in_array($permission, $perms, true),
            403,
            "Permission {$permission} requise."
        );
    }

    /**
     * Indicateurs consolidés Personnel & Formations (CDC 6)
     */
    public function overview(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'personnel.read');
        $officineId = $this->getOfficineId($request);
        $currentYear = (int) date('Y');

        // Effectif
        $totalEmployees = Employee::where('officine_id', $officineId)->count();
        $activeEmployees = Employee::where('officine_id', $officineId)->where('status', 'actif')->count();
        $onLeaveEmployees = Employee::where('officine_id', $officineId)->where('status', 'conge')->count();

        // Fiches de poste
        $totalJobDescriptions = JobDescription::where('officine_id', $officineId)->where('is_active', true)->count();

        // Demandes de congés en attente
        $pendingLeaves = LeaveRequest::where('officine_id', $officineId)->where('status', 'soumis')->count();

        // Plannings / Gardes du mois
        $startOfMonth = Carbon::now()->startOfMonth()->toDateString();
        $endOfMonth = Carbon::now()->endOfMonth()->toDateString();
        $shiftsThisMonth = Shift::where('officine_id', $officineId)
            ->whereBetween('shift_date', [$startOfMonth, $endOfMonth])
            ->count();

        // Plans de formation & taux de réalisation
        $plansThisYear = TrainingPlan::where('officine_id', $officineId)->where('year', $currentYear)->count();
        $completedPlans = TrainingPlan::where('officine_id', $officineId)->where('year', $currentYear)->where('status', 'cloture')->count();
        $trainingCompletionRate = $plansThisYear > 0 ? round(($completedPlans / $plansThisYear) * 100, 1) : null;

        // Alertes Ordre B et habilitations expirant sous 30 jours
        $in30Days = Carbon::now()->addDays(30)->toDateString();
        $expiringOrdreB = Employee::where('officine_id', $officineId)
            ->whereNotNull('ordre_b_expiry')
            ->where('ordre_b_expiry', '<=', $in30Days)
            ->where('status', 'actif')
            ->select('id', 'first_name', 'last_name', 'role_title', 'ordre_b_number', 'ordre_b_expiry')
            ->get();

        return response()->json([
            'meta' => [
                'officine_id' => $officineId,
                'year' => $currentYear,
                'as_of' => now()->toIso8601String(),
            ],
            'kpis' => [
                'total_employees' => $totalEmployees,
                'active_employees' => $activeEmployees,
                'on_leave_employees' => $onLeaveEmployees,
                'total_job_descriptions' => $totalJobDescriptions,
                'pending_leaves' => $pendingLeaves,
                'shifts_this_month' => $shiftsThisMonth,
                'plans_this_year' => $plansThisYear,
                'training_completion_rate' => $trainingCompletionRate !== null ? "{$trainingCompletionRate}%" : 'non disponible',
                'expiring_credentials_count' => $expiringOrdreB->count(),
            ],
            'expiring_credentials' => $expiringOrdreB,
        ]);
    }

    // ==========================================
    // 1. EMPLOYEES (Dossiers Salariés)
    // ==========================================

    public function employeesIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'personnel.read');
        $officineId = $this->getOfficineId($request);

        $query = Employee::where('officine_id', $officineId);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('contract_type')) {
            $query->where('contract_type', $request->query('contract_type'));
        }
        if ($request->filled('search')) {
            $search = '%' . $request->query('search') . '%';
            $query->where(function ($q) use ($search) {
                $q->where('matricule', 'ilike', $search)
                    ->orWhere('first_name', 'ilike', $search)
                    ->orWhere('last_name', 'ilike', $search)
                    ->orWhere('role_title', 'ilike', $search);
            });
        }

        $employees = $query->orderBy('last_name')->orderBy('first_name')->get();
        return response()->json(['data' => $employees]);
    }

    public function storeEmployee(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'personnel.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'matricule' => 'required|string|max:50',
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'nullable|email|max:150',
            'phone' => 'nullable|string|max:30',
            'role_title' => 'required|string|max:100',
            'contract_type' => 'required|string|in:CDI,CDD,Stage,Prestataire',
            'hire_date' => 'required|date',
            'status' => 'sometimes|string|in:actif,conge,suspendu,quitte',
            'ordre_b_number' => 'nullable|string|max:50',
            'ordre_b_expiry' => 'nullable|date',
            'qualifications' => 'nullable|array',
            'emergency_contact' => 'nullable|string|max:200',
        ]);

        $existing = Employee::where('officine_id', $officineId)
            ->where('matricule', $validated['matricule'])
            ->first();
        if ($existing) {
            return response()->json(['message' => 'Le matricule existe déjà pour cette officine.'], 422);
        }

        return DB::transaction(function () use ($validated, $officineId) {
            $employee = Employee::create([
                ...$validated,
                'officine_id' => $officineId,
                'status' => $validated['status'] ?? 'actif',
                'version' => 1,
            ]);

            // Initialiser un solde de congés pour l'année en cours
            $currentYear = (int) date('Y');
            LeaveBalance::firstOrCreate(
                [
                    'officine_id' => $officineId,
                    'employee_id' => $employee->id,
                    'year' => $currentYear,
                ],
                [
                    'acquired_days' => 24.0, // 24 jours de droit annuel conventionnel
                    'taken_days' => 0.0,
                    'remaining_days' => 24.0,
                    'version' => 1,
                ]
            );

            return response()->json(['data' => $employee], 201);
        });
    }

    public function showEmployee(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'personnel.read');
        $officineId = $this->getOfficineId($request);

        $employee = Employee::with(['leaveBalances', 'leaveRequests', 'shifts', 'attendances.session.plan'])
            ->where('officine_id', $officineId)
            ->find($id);

        if (!$employee) {
            return response()->json(['message' => 'Employé non trouvé.'], 404);
        }

        return response()->json(['data' => $employee]);
    }

    public function updateEmployee(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'personnel.write');
        $officineId = $this->getOfficineId($request);

        $employee = Employee::where('officine_id', $officineId)->find($id);
        if (!$employee) {
            return response()->json(['message' => 'Employé non trouvé.'], 404);
        }

        if ($request->has('version') && (int) $request->input('version') !== (int) $employee->version) {
            return response()->json(['message' => 'Conflit de version concurrentielle (409).'], 409);
        }

        $validated = $request->validate([
            'first_name' => 'sometimes|required|string|max:100',
            'last_name' => 'sometimes|required|string|max:100',
            'email' => 'nullable|email|max:150',
            'phone' => 'nullable|string|max:30',
            'role_title' => 'sometimes|required|string|max:100',
            'contract_type' => 'sometimes|required|string|in:CDI,CDD,Stage,Prestataire',
            'hire_date' => 'sometimes|required|date',
            'status' => 'sometimes|required|string|in:actif,conge,suspendu,quitte',
            'ordre_b_number' => 'nullable|string|max:50',
            'ordre_b_expiry' => 'nullable|date',
            'qualifications' => 'nullable|array',
            'emergency_contact' => 'nullable|string|max:200',
        ]);

        $employee->update([
            ...$validated,
            'version' => $employee->version + 1,
        ]);

        return response()->json(['data' => $employee]);
    }

    // ==========================================
    // 2. JOB DESCRIPTIONS (Fiches de Poste)
    // ==========================================

    public function jobDescriptionsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'personnel.read');
        $officineId = $this->getOfficineId($request);

        $jobs = JobDescription::where('officine_id', $officineId)
            ->orderBy('title')
            ->get();

        return response()->json(['data' => $jobs]);
    }

    public function storeJobDescription(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'personnel.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'code' => 'required|string|max:30',
            'title' => 'required|string|max:150',
            'department' => 'required|string|max:100',
            'main_missions' => 'required|string',
            'required_skills' => 'nullable|string',
            'required_profile' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $existing = JobDescription::where('officine_id', $officineId)
            ->where('code', $validated['code'])
            ->first();
        if ($existing) {
            return response()->json(['message' => 'Ce code de fiche de poste existe déjà.'], 422);
        }

        $job = JobDescription::create([
            ...$validated,
            'officine_id' => $officineId,
            'version' => 1,
        ]);

        return response()->json(['data' => $job], 201);
    }

    public function updateJobDescription(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'personnel.write');
        $officineId = $this->getOfficineId($request);

        $job = JobDescription::where('officine_id', $officineId)->find($id);
        if (!$job) {
            return response()->json(['message' => 'Fiche de poste non trouvée.'], 404);
        }

        if ($request->has('version') && (int) $request->input('version') !== (int) $job->version) {
            return response()->json(['message' => 'Conflit de version concurrentielle (409).'], 409);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:150',
            'department' => 'sometimes|required|string|max:100',
            'main_missions' => 'sometimes|required|string',
            'required_skills' => 'nullable|string',
            'required_profile' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $job->update([
            ...$validated,
            'version' => $job->version + 1,
        ]);

        return response()->json(['data' => $job]);
    }

    // ==========================================
    // 3. LEAVE REQUESTS & BALANCES (Congés)
    // ==========================================

    public function leaveRequestsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'personnel.read');
        $officineId = $this->getOfficineId($request);

        $query = LeaveRequest::with(['employee:id,matricule,first_name,last_name,role_title', 'approver:id,name'])
            ->where('officine_id', $officineId);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('employee_id')) {
            $query->where('employee_id', (int) $request->query('employee_id'));
        }

        $requests = $query->orderByDesc('created_at')->get();
        return response()->json(['data' => $requests]);
    }

    public function storeLeaveRequest(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'personnel.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'employee_id' => 'required|integer',
            'leave_type' => 'required|string|in:conge_annuel,maladie,maternite,evenement_familial,sans_solde',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'days_count' => 'required|numeric|min:0.5',
            'reason' => 'nullable|string',
            'status' => 'sometimes|string|in:brouillon,soumis',
        ]);

        $employee = Employee::where('officine_id', $officineId)->find($validated['employee_id']);
        if (!$employee) {
            return response()->json(['message' => 'Employé non trouvé dans cette officine.'], 404);
        }

        $leave = LeaveRequest::create([
            ...$validated,
            'officine_id' => $officineId,
            'status' => $validated['status'] ?? 'soumis',
            'version' => 1,
        ]);

        return response()->json(['data' => $leave], 201);
    }

    public function decideLeaveRequest(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'personnel.write');
        $officineId = $this->getOfficineId($request);

        $leave = LeaveRequest::where('officine_id', $officineId)->find($id);
        if (!$leave) {
            return response()->json(['message' => 'Demande de congé non trouvée.'], 404);
        }

        if ($leave->status === 'approuve' || $leave->status === 'refuse') {
            return response()->json(['message' => 'Cette demande a déjà été statuée.'], 422);
        }

        $validated = $request->validate([
            'decision' => 'required|string|in:approuve,refuse',
            'decision_notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($leave, $validated, $request, $officineId) {
            $isApproved = $validated['decision'] === 'approuve';

            // Règle CDC Section 7 : Une absence refusée ne réduit pas les droits
            if ($isApproved && $leave->leave_type === 'conge_annuel') {
                $year = (int) date('Y', strtotime((string) $leave->start_date));
                $balance = LeaveBalance::where('officine_id', $officineId)
                    ->where('employee_id', $leave->employee_id)
                    ->where('year', $year)
                    ->lockForUpdate()
                    ->first();

                if ($balance) {
                    $balance->taken_days += (float) $leave->days_count;
                    $balance->remaining_days = max(0, $balance->acquired_days - $balance->taken_days);
                    $balance->version += 1;
                    $balance->save();
                }
            }

            $leave->update([
                'status' => $validated['decision'],
                'approved_by_user_id' => $request->user()?->id,
                'decided_at' => now(),
                'decision_notes' => $validated['decision_notes'] ?? null,
                'version' => $leave->version + 1,
            ]);

            return response()->json(['data' => $leave]);
        });
    }

    public function leaveBalancesIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'personnel.read');
        $officineId = $this->getOfficineId($request);
        $year = (int) ($request->query('year') ?? date('Y'));

        $balances = LeaveBalance::with('employee:id,matricule,first_name,last_name,role_title')
            ->where('officine_id', $officineId)
            ->where('year', $year)
            ->get();

        return response()->json(['data' => $balances]);
    }

    // ==========================================
    // 4. SHIFTS & PLANNING (Gardes & Horaires)
    // ==========================================

    public function shiftsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'personnel.read');
        $officineId = $this->getOfficineId($request);

        $query = Shift::with(['employee:id,matricule,first_name,last_name,role_title', 'replacement:id,first_name,last_name'])
            ->where('officine_id', $officineId);

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('shift_date', [$request->query('start_date'), $request->query('end_date')]);
        }
        if ($request->filled('employee_id')) {
            $query->where('employee_id', (int) $request->query('employee_id'));
        }

        $shifts = $query->orderBy('shift_date')->orderBy('start_time')->get();
        return response()->json(['data' => $shifts]);
    }

    public function storeShift(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'personnel.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'employee_id' => 'required|integer',
            'shift_type' => 'required|string|in:jour,garde_nuit,garde_dimanche,astreinte',
            'shift_date' => 'required|date',
            'start_time' => 'required|string|max:10',
            'end_time' => 'required|string|max:10',
            'status' => 'sometimes|string|in:planifie,confirme',
            'notes' => 'nullable|string',
        ]);

        $employee = Employee::where('officine_id', $officineId)->find($validated['employee_id']);
        if (!$employee) {
            return response()->json(['message' => 'Employé non trouvé.'], 404);
        }

        // Détection de conflit de créneau pour le même salarié (CDC 3.3)
        $conflict = Shift::where('officine_id', $officineId)
            ->where('employee_id', $validated['employee_id'])
            ->where('shift_date', $validated['shift_date'])
            ->where('status', '!=', 'annule')
            ->where(function ($q) use ($validated) {
                $q->whereBetween('start_time', [$validated['start_time'], $validated['end_time']])
                    ->orWhereBetween('end_time', [$validated['start_time'], $validated['end_time']]);
            })
            ->first();

        if ($conflict) {
            return response()->json([
                'message' => 'Conflit de planning : un créneau existe déjà pour cet employé sur cette plage horaire.',
                'conflicting_shift' => $conflict,
            ], 422);
        }

        $shift = Shift::create([
            ...$validated,
            'officine_id' => $officineId,
            'status' => $validated['status'] ?? 'planifie',
            'version' => 1,
        ]);

        return response()->json(['data' => $shift], 201);
    }

    public function updateShift(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'personnel.write');
        $officineId = $this->getOfficineId($request);

        $shift = Shift::where('officine_id', $officineId)->find($id);
        if (!$shift) {
            return response()->json(['message' => 'Créneau non trouvé.'], 404);
        }

        $validated = $request->validate([
            'status' => 'sometimes|required|string|in:planifie,confirme,effectue,remplace,annule',
            'replaced_by_employee_id' => 'nullable|integer',
            'notes' => 'nullable|string',
        ]);

        $shift->update([
            ...$validated,
            'version' => $shift->version + 1,
        ]);

        return response()->json(['data' => $shift]);
    }

    // ==========================================
    // 5. TRAINING PLANS & SESSIONS (Formations)
    // ==========================================

    public function trainingPlansIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'personnel.read');
        $officineId = $this->getOfficineId($request);
        $year = $request->query('year');

        $query = TrainingPlan::with(['sessions.attendances.employee:id,matricule,first_name,last_name'])
            ->where('officine_id', $officineId);

        if ($year) {
            $query->where('year', (int) $year);
        }

        $plans = $query->orderByDesc('year')->orderBy('theme')->get();
        return response()->json(['data' => $plans]);
    }

    public function storeTrainingPlan(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'personnel.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'year' => 'required|integer|min:2020|max:2035',
            'theme' => 'required|string|max:200',
            'description' => 'nullable|string',
            'trainer_organization' => 'nullable|string|max:150',
            'training_type' => 'required|string|in:interne_bpd,externe,securite_incendie,pharmacovigilance',
            'duration_hours' => 'required|integer|min:1',
            'target_audience' => 'nullable|string|max:150',
            'status' => 'sometimes|string|in:planifie,en_cours,cloture,annule',
            'target_date' => 'nullable|date',
        ]);

        $plan = TrainingPlan::create([
            ...$validated,
            'officine_id' => $officineId,
            'status' => $validated['status'] ?? 'planifie',
            'version' => 1,
        ]);

        return response()->json(['data' => $plan], 201);
    }

    public function storeTrainingSession(Request $request, int $planId): JsonResponse
    {
        $this->checkPermission($request, 'personnel.write');
        $officineId = $this->getOfficineId($request);

        $plan = TrainingPlan::where('officine_id', $officineId)->find($planId);
        if (!$plan) {
            return response()->json(['message' => 'Plan de formation non trouvé.'], 404);
        }

        $validated = $request->validate([
            'session_date' => 'required|date',
            'start_time' => 'nullable|string|max:10',
            'end_time' => 'nullable|string|max:10',
            'location' => 'nullable|string|max:150',
            'trainer_name' => 'nullable|string|max:100',
            'status' => 'sometimes|string|in:planifiee,realisee,annulee',
            'notes' => 'nullable|string',
            'attendees' => 'sometimes|array',
            'attendees.*.employee_id' => 'required|integer',
            'attendees.*.presence_status' => 'sometimes|string|in:present,absent_justifie,absent_injustifie',
            'attendees.*.score' => 'nullable|numeric|min:0|max:100',
        ]);

        return DB::transaction(function () use ($validated, $plan, $officineId) {
            $session = TrainingSession::create([
                'officine_id' => $officineId,
                'training_plan_id' => $plan->id,
                'session_date' => $validated['session_date'],
                'start_time' => $validated['start_time'] ?? null,
                'end_time' => $validated['end_time'] ?? null,
                'location' => $validated['location'] ?? 'Officine',
                'trainer_name' => $validated['trainer_name'] ?? null,
                'status' => $validated['status'] ?? 'planifiee',
                'notes' => $validated['notes'] ?? null,
                'version' => 1,
            ]);

            if (!empty($validated['attendees'])) {
                foreach ($validated['attendees'] as $att) {
                    TrainingAttendance::create([
                        'training_session_id' => $session->id,
                        'employee_id' => $att['employee_id'],
                        'presence_status' => $att['presence_status'] ?? 'present',
                        'score' => $att['score'] ?? null,
                        'version' => 1,
                    ]);
                }
            }

            return response()->json(['data' => $session->load('attendances.employee:id,matricule,first_name,last_name')], 201);
        });
    }

    public function recordSessionAttendance(Request $request, int $sessionId): JsonResponse
    {
        $this->checkPermission($request, 'personnel.write');
        $officineId = $this->getOfficineId($request);

        $session = TrainingSession::where('officine_id', $officineId)->find($sessionId);
        if (!$session) {
            return response()->json(['message' => 'Session de formation non trouvée.'], 404);
        }

        $validated = $request->validate([
            'attendances' => 'required|array',
            'attendances.*.employee_id' => 'required|integer',
            'attendances.*.presence_status' => 'required|string|in:present,absent_justifie,absent_injustifie',
            'attendances.*.score' => 'nullable|numeric|min:0|max:100',
            'attendances.*.evaluation_comments' => 'nullable|string',
            'attendances.*.certificate_ref' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($session, $validated) {
            foreach ($validated['attendances'] as $att) {
                $existing = TrainingAttendance::where('training_session_id', $session->id)
                    ->where('employee_id', $att['employee_id'])
                    ->first();

                if ($existing) {
                    $existing->update([
                        'presence_status' => $att['presence_status'],
                        'score' => $att['score'] ?? null,
                        'evaluation_comments' => $att['evaluation_comments'] ?? null,
                        'certificate_ref' => $att['certificate_ref'] ?? null,
                        'version' => $existing->version + 1,
                    ]);
                } else {
                    TrainingAttendance::create([
                        'training_session_id' => $session->id,
                        'employee_id' => $att['employee_id'],
                        'presence_status' => $att['presence_status'],
                        'score' => $att['score'] ?? null,
                        'evaluation_comments' => $att['evaluation_comments'] ?? null,
                        'certificate_ref' => $att['certificate_ref'] ?? null,
                        'version' => 1,
                    ]);
                }
            }

            $session->update([
                'status' => 'realisee',
                'version' => $session->version + 1,
            ]);

            return response()->json(['message' => 'Présences et évaluations enregistrées avec succès.']);
        });
    }

    // ==========================================
    // 6. PERFORMANCE REVIEWS (Évaluations)
    // ==========================================

    public function reviewsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'personnel.read');
        $officineId = $this->getOfficineId($request);

        $query = PerformanceReview::with(['employee:id,matricule,first_name,last_name,role_title', 'reviewer:id,name'])
            ->where('officine_id', $officineId);

        if ($request->filled('employee_id')) {
            $query->where('employee_id', (int) $request->query('employee_id'));
        }
        if ($request->filled('review_type')) {
            $query->where('review_type', $request->query('review_type'));
        }

        $reviews = $query->orderByDesc('review_date')->get();
        return response()->json(['data' => $reviews]);
    }

    public function storePerformanceReview(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'personnel.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'employee_id' => 'required|integer',
            'review_type' => 'required|string|in:cadre,non_cadre',
            'review_period' => 'required|string|max:50',
            'review_date' => 'required|date',
            'criteria_scores' => 'required|array',
            'criteria_scores.*.criterion' => 'required|string',
            'criteria_scores.*.score' => 'required|numeric|min:0|max:20',
            'overall_score' => 'required|numeric|min:0|max:20',
            'strengths' => 'nullable|string',
            'improvements' => 'nullable|string',
            'action_plan' => 'nullable|string',
            'status' => 'sometimes|string|in:brouillon,finalise',
            'is_confidential' => 'sometimes|boolean',
        ]);

        $employee = Employee::where('officine_id', $officineId)->find($validated['employee_id']);
        if (!$employee) {
            return response()->json(['message' => 'Employé non trouvé.'], 404);
        }

        $review = PerformanceReview::create([
            ...$validated,
            'officine_id' => $officineId,
            'reviewer_id' => $request->user()?->id ?? 1,
            'status' => $validated['status'] ?? 'brouillon',
            'is_confidential' => $validated['is_confidential'] ?? true,
            'version' => 1,
        ]);

        return response()->json(['data' => $review], 201);
    }
}

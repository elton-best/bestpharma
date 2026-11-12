<?php

declare(strict_types=1);

namespace App\Modules\LocauxEquipements\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\LocauxEquipements\Models\CleaningOccurrence;
use App\Modules\LocauxEquipements\Models\CleaningPlan;
use App\Modules\LocauxEquipements\Models\CommissioningTest;
use App\Modules\LocauxEquipements\Models\Equipment;
use App\Modules\LocauxEquipements\Models\EquipmentLocation;
use App\Modules\LocauxEquipements\Models\EquipmentLocationHistory;
use App\Modules\LocauxEquipements\Models\EquipmentWithdrawal;
use App\Modules\LocauxEquipements\Models\GeneratorTest;
use App\Modules\LocauxEquipements\Models\MaintenanceEvent;
use App\Modules\LocauxEquipements\Models\MaintenancePlan;
use App\Modules\Qualite\Models\QualityAction;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class Module9EquipementLocauxController extends Controller
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
        // Accepts either locauxequipements.* or qualite.*
        $altPerm = str_starts_with($permission, 'locauxequipements.')
            ? str_replace('locauxequipements.', 'qualite.', $permission)
            : str_replace('qualite.', 'locauxequipements.', $permission);

        abort_unless(
            in_array($permission, $perms, true)
            || in_array($altPerm, $perms, true)
            || in_array('admin', $perms, true),
            403,
            "Permission {$permission} requise."
        );
    }

    /**
     * Indicateurs consolidés Équipements & Locaux (CDC 6)
     */
    public function overview(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.read');
        $officineId = $this->getOfficineId($request);
        $today = Carbon::today()->toDateString();
        $startOfMonth = Carbon::now()->startOfMonth()->toDateString();
        $endOfMonth = Carbon::now()->endOfMonth()->toDateString();

        // Équipements par état
        $totalEquipments = Equipment::where('officine_id', $officineId)->count();
        $inService = Equipment::where('officine_id', $officineId)->where('status', 'en_service')->count();
        $inMaintenance = Equipment::where('officine_id', $officineId)->where('status', 'en_maintenance')->count();
        $outOfOrder = Equipment::where('officine_id', $officineId)->where('status', 'en_panne')->count();
        $withdrawn = Equipment::where('officine_id', $officineId)->where('status', 'hors_service')->count();

        $criticalBpdCount = Equipment::where('officine_id', $officineId)->where('criticality', 'critique_bpd')->count();

        // Maintenances & étalonnages en retard
        $overdueMaintenances = MaintenancePlan::where('officine_id', $officineId)
            ->where('is_active', true)
            ->where('next_due_date', '<', $today)
            ->count();

        // Dernier test groupe électrogène
        $lastGeneratorTest = GeneratorTest::where('officine_id', $officineId)
            ->orderByDesc('test_date')
            ->first();

        // Nettoyage ce mois-ci
        $occurrencesCount = CleaningOccurrence::where('officine_id', $officineId)
            ->whereBetween('planned_date', [$startOfMonth, $endOfMonth])
            ->count();
        $completedOccurrences = CleaningOccurrence::where('officine_id', $officineId)
            ->whereBetween('planned_date', [$startOfMonth, $endOfMonth])
            ->where('status', 'realise')
            ->count();
        $cleaningRate = $occurrencesCount > 0 ? round(($completedOccurrences / $occurrencesCount) * 100, 1) : null;

        // Demandes de retrait en attente
        $pendingWithdrawals = EquipmentWithdrawal::where('officine_id', $officineId)
            ->where('status', 'demande')
            ->count();

        return response()->json([
            'meta' => [
                'officine_id' => $officineId,
                'as_of' => now()->toIso8601String(),
            ],
            'kpis' => [
                'total_equipments' => $totalEquipments,
                'in_service' => $inService,
                'in_maintenance' => $inMaintenance,
                'out_of_order' => $outOfOrder,
                'withdrawn' => $withdrawn,
                'critical_bpd_count' => $criticalBpdCount,
                'overdue_maintenances' => $overdueMaintenances,
                'generator_last_test' => $lastGeneratorTest ? [
                    'date' => $lastGeneratorTest->test_date,
                    'result' => $lastGeneratorTest->test_result,
                    'fuel_level' => "{$lastGeneratorTest->fuel_level_percent}%",
                ] : null,
                'cleaning_completion_rate' => $cleaningRate !== null ? "{$cleaningRate}%" : 'non disponible',
                'pending_withdrawals' => $pendingWithdrawals,
            ],
        ]);
    }

    // ==========================================
    // 1. LOCATIONS (Zones et Emplacements)
    // ==========================================

    public function locationsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.read');
        $officineId = $this->getOfficineId($request);

        $locations = EquipmentLocation::where('officine_id', $officineId)
            ->withCount('equipments')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $locations]);
    }

    public function storeLocation(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $existing = EquipmentLocation::where('officine_id', $officineId)
            ->where('name', $validated['name'])
            ->first();
        if ($existing) {
            return response()->json(['message' => 'Cette zone/emplacement existe déjà.'], 422);
        }

        $loc = EquipmentLocation::create([
            ...$validated,
            'officine_id' => $officineId,
            'version' => 1,
        ]);

        return response()->json(['data' => $loc], 201);
    }

    // ==========================================
    // 2. EQUIPMENTS (Inventaire Matériel)
    // ==========================================

    public function equipmentsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.read');
        $officineId = $this->getOfficineId($request);

        $query = Equipment::with('location:id,name')->where('officine_id', $officineId);

        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('criticality')) {
            $query->where('criticality', $request->query('criticality'));
        }
        if ($request->filled('search')) {
            $search = '%' . $request->query('search') . '%';
            $query->where(function ($q) use ($search) {
                $q->where('code', 'ilike', $search)
                    ->orWhere('designation', 'ilike', $search)
                    ->orWhere('brand', 'ilike', $search)
                    ->orWhere('model', 'ilike', $search);
            });
        }

        $equipments = $query->orderBy('code')->get();
        return response()->json(['data' => $equipments]);
    }

    public function storeEquipment(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'designation' => 'required|string|max:150',
            'category' => 'required|string|in:froid,climatisation,energie,pesage,informatique,securite,autre',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'acquisition_year' => 'nullable|integer|min:1990|max:2035',
            'installation_date' => 'nullable|date',
            'current_location_id' => 'nullable|integer',
            'status' => 'sometimes|string|in:en_service,en_panne,en_maintenance,hors_service',
            'criticality' => 'sometimes|string|in:critique_bpd,standard',
            'notes' => 'nullable|string',
        ]);

        $existing = Equipment::where('officine_id', $officineId)
            ->where('code', $validated['code'])
            ->first();
        if ($existing) {
            return response()->json(['message' => 'Le code équipement existe déjà pour cette officine.'], 422);
        }

        return DB::transaction(function () use ($validated, $officineId, $request) {
            $equipment = Equipment::create([
                ...$validated,
                'officine_id' => $officineId,
                'status' => $validated['status'] ?? 'en_service',
                'criticality' => $validated['criticality'] ?? 'critique_bpd',
                'version' => 1,
            ]);

            if (!empty($validated['current_location_id'])) {
                EquipmentLocationHistory::create([
                    'officine_id' => $officineId,
                    'equipment_id' => $equipment->id,
                    'location_id' => $validated['current_location_id'],
                    'moved_at' => now(),
                    'moved_by_user_id' => $request->user()?->id,
                    'reason' => 'Affectation initiale lors de la création',
                ]);
            }

            return response()->json(['data' => $equipment], 201);
        });
    }

    public function showEquipment(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.read');
        $officineId = $this->getOfficineId($request);

        $equipment = Equipment::with([
            'location',
            'locationHistories.location:id,name',
            'locationHistories.movedBy:id,name',
            'commissioningTests.conductedBy:id,name',
            'maintenancePlans',
            'maintenanceEvents.verifiedBy:id,name',
            'generatorTests.testedBy:id,name',
            'withdrawals.requestedBy:id,name',
            'withdrawals.approvedBy:id,name',
        ])
            ->where('officine_id', $officineId)
            ->find($id);

        if (!$equipment) {
            return response()->json(['message' => 'Équipement non trouvé.'], 404);
        }

        return response()->json(['data' => $equipment]);
    }

    public function updateEquipment(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.write');
        $officineId = $this->getOfficineId($request);

        $equipment = Equipment::where('officine_id', $officineId)->find($id);
        if (!$equipment) {
            return response()->json(['message' => 'Équipement non trouvé.'], 404);
        }

        if ($request->has('version') && (int) $request->input('version') !== (int) $equipment->version) {
            return response()->json(['message' => 'Conflit de version concurrentielle (409).'], 409);
        }

        $validated = $request->validate([
            'designation' => 'sometimes|required|string|max:150',
            'category' => 'sometimes|required|string|in:froid,climatisation,energie,pesage,informatique,securite,autre',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'current_location_id' => 'nullable|integer',
            'status' => 'sometimes|required|string|in:en_service,en_panne,en_maintenance,hors_service',
            'criticality' => 'sometimes|required|string|in:critique_bpd,standard',
            'notes' => 'nullable|string',
            'location_change_reason' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($equipment, $validated, $officineId, $request) {
            $newLocationId = array_key_exists('current_location_id', $validated) ? $validated['current_location_id'] : null;

            // CDC 7 : Conserver l'historique des localisations si l'emplacement a changé
            if ($newLocationId && (int) $newLocationId !== (int) $equipment->current_location_id) {
                EquipmentLocationHistory::create([
                    'officine_id' => $officineId,
                    'equipment_id' => $equipment->id,
                    'location_id' => (int) $newLocationId,
                    'moved_at' => now(),
                    'moved_by_user_id' => $request->user()?->id,
                    'reason' => $validated['location_change_reason'] ?? 'Déplacement de matériel',
                ]);
            }

            unset($validated['location_change_reason']);
            $equipment->update([
                ...$validated,
                'version' => $equipment->version + 1,
            ]);

            return response()->json(['data' => $equipment]);
        });
    }

    // ==========================================
    // 3. COMMISSIONING (Mise en service - CDC 3.2)
    // ==========================================

    public function storeCommissioningTest(Request $request, int $equipmentId): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.write');
        $officineId = $this->getOfficineId($request);

        $equipment = Equipment::where('officine_id', $officineId)->find($equipmentId);
        if (!$equipment) {
            return response()->json(['message' => 'Équipement non trouvé.'], 404);
        }

        $validated = $request->validate([
            'test_date' => 'required|date',
            'electrical_safety_checked' => 'required|boolean',
            'functional_test_passed' => 'required|boolean',
            'temperature_conformity_passed' => 'nullable|boolean',
            'calibration_checked' => 'nullable|boolean',
            'staff_trained' => 'required|boolean',
            'decision' => 'required|string|in:conforme,non_conforme,avec_reserve',
            'notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($equipment, $validated, $officineId, $request) {
            $test = CommissioningTest::create([
                ...$validated,
                'officine_id' => $officineId,
                'equipment_id' => $equipment->id,
                'conducted_by_user_id' => $request->user()?->id ?? 1,
                'version' => 1,
            ]);

            if ($validated['decision'] === 'conforme') {
                $equipment->update([
                    'status' => 'en_service',
                    'installation_date' => $validated['test_date'],
                    'version' => $equipment->version + 1,
                ]);
            } elseif ($validated['decision'] === 'non_conforme') {
                $equipment->update([
                    'status' => 'en_panne',
                    'version' => $equipment->version + 1,
                ]);
            }

            return response()->json(['data' => $test], 201);
        });
    }

    // ==========================================
    // 4. MAINTENANCE & CALIBRATION (CDC 3.3)
    // ==========================================

    public function maintenancePlansIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.read');
        $officineId = $this->getOfficineId($request);

        $plans = MaintenancePlan::with('equipment:id,code,designation,category')
            ->where('officine_id', $officineId)
            ->orderBy('next_due_date')
            ->get();

        return response()->json(['data' => $plans]);
    }

    public function storeMaintenancePlan(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'equipment_id' => 'required|integer',
            'maintenance_type' => 'required|string|in:preventive,etalonnage,qualification,curative',
            'frequency_days' => 'required|integer|min:7|max:730',
            'next_due_date' => 'required|date',
            'default_provider_name' => 'nullable|string|max:150',
            'instructions' => 'nullable|string',
        ]);

        $equipment = Equipment::where('officine_id', $officineId)->find($validated['equipment_id']);
        if (!$equipment) {
            return response()->json(['message' => 'Équipement non trouvé.'], 404);
        }

        $plan = MaintenancePlan::create([
            ...$validated,
            'officine_id' => $officineId,
            'is_active' => true,
            'version' => 1,
        ]);

        return response()->json(['data' => $plan], 201);
    }

    public function maintenanceEventsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.read');
        $officineId = $this->getOfficineId($request);

        $query = MaintenanceEvent::with(['equipment:id,code,designation', 'verifiedBy:id,name'])
            ->where('officine_id', $officineId);

        if ($request->has('verified')) {
            $query->where('is_verified', filter_var($request->query('verified'), FILTER_VALIDATE_BOOLEAN));
        }

        $events = $query->orderByDesc('intervention_date')->get();
        return response()->json(['data' => $events]);
    }

    public function storeMaintenanceEvent(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'equipment_id' => 'required|integer',
            'maintenance_plan_id' => 'nullable|integer',
            'intervention_type' => 'required|string|in:preventive,curative,etalonnage',
            'intervention_date' => 'required|date',
            'provider_name' => 'nullable|string|max:150',
            'technician_name' => 'nullable|string|max:100',
            'description' => 'required|string',
            'result' => 'required|string|in:conforme,non_conforme,a_surveiller',
            'next_due_date' => 'nullable|date',
            'cost' => 'nullable|numeric|min:0',
        ]);

        $equipment = Equipment::where('officine_id', $officineId)->find($validated['equipment_id']);
        if (!$equipment) {
            return response()->json(['message' => 'Équipement non trouvé.'], 404);
        }

        return DB::transaction(function () use ($validated, $equipment, $officineId, $request) {
            $createdActionId = null;
            $userId = $request->user()?->id ?? 1;

            // Si le résultat est non conforme, on génère une action qualité CAPA (Module 04)
            if ($validated['result'] === 'non_conforme') {
                $action = QualityAction::create([
                    'officine_id' => $officineId,
                    'created_by' => $userId,
                    'title' => "Intervention non conforme sur {$equipment->designation} ({$equipment->code})",
                    'chapter' => 'Locaux & Équipements',
                    'severity' => 'high',
                    'owner' => $request->user()?->name ?? 'Responsable Qualité',
                    'due_date' => now()->addDays(7)->toDateString(),
                    'status' => 'open',
                    'description' => "Intervention de maintenance négative : {$validated['description']}",
                    'resolution' => '',
                ]);
                $createdActionId = $action->id;
                $equipment->update(['status' => 'en_panne', 'version' => $equipment->version + 1]);
            }

            $event = MaintenanceEvent::create([
                ...$validated,
                'officine_id' => $officineId,
                'is_verified' => false, // CDC 7: Une intervention non vérifiée reste distincte
                'created_action_id' => $createdActionId,
                'version' => 1,
            ]);

            // Mettre à jour le plan de maintenance associé s'il existe
            if (!empty($validated['maintenance_plan_id'])) {
                $plan = MaintenancePlan::where('officine_id', $officineId)->find($validated['maintenance_plan_id']);
                if ($plan) {
                    $nextDue = $validated['next_due_date'] ?? Carbon::parse($validated['intervention_date'])->addDays($plan->frequency_days)->toDateString();
                    $plan->update([
                        'last_performed_at' => $validated['intervention_date'],
                        'next_due_date' => $nextDue,
                        'version' => $plan->version + 1,
                    ]);
                }
            }

            return response()->json(['data' => $event], 201);
        });
    }

    public function verifyMaintenanceEvent(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.write');
        $officineId = $this->getOfficineId($request);

        $event = MaintenanceEvent::where('officine_id', $officineId)->find($id);
        if (!$event) {
            return response()->json(['message' => 'Intervention non trouvée.'], 404);
        }

        $event->update([
            'is_verified' => true,
            'verified_by_user_id' => $request->user()?->id,
            'verified_at' => now(),
            'version' => $event->version + 1,
        ]);

        return response()->json(['data' => $event]);
    }

    // ==========================================
    // 5. GENERATOR TESTS (Groupe Électrogène - CDC 3.4)
    // ==========================================

    public function generatorTestsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.read');
        $officineId = $this->getOfficineId($request);

        $tests = GeneratorTest::with(['equipment:id,code,designation', 'testedBy:id,name'])
            ->where('officine_id', $officineId)
            ->orderByDesc('test_date')
            ->get();

        return response()->json(['data' => $tests]);
    }

    public function storeGeneratorTest(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'equipment_id' => 'required|integer',
            'test_date' => 'required|date',
            'fuel_level_percent' => 'required|numeric|min:0|max:100',
            'start_delay_seconds' => 'required|integer|min:1',
            'oil_level_ok' => 'required|boolean',
            'battery_voltage_ok' => 'required|boolean',
            'frequency_hz' => 'nullable|numeric|min:40|max:70',
            'test_result' => 'required|string|in:conforme,echec,reserve',
            'comment' => 'nullable|string',
        ]);

        $equipment = Equipment::where('officine_id', $officineId)->find($validated['equipment_id']);
        if (!$equipment) {
            return response()->json(['message' => 'Équipement groupe électrogène non trouvé.'], 404);
        }

        return DB::transaction(function () use ($validated, $equipment, $officineId, $request) {
            $createdActionId = null;
            $userId = $request->user()?->id ?? 1;

            // CDC 3.4 : Résultat négatif ou manque de carburant (< 25%) peut créer action
            if ($validated['test_result'] === 'echec' || (float) $validated['fuel_level_percent'] < 25.0) {
                $reason = $validated['test_result'] === 'echec'
                    ? "Échec du test automatique de basculement du groupe électrogène"
                    : "Niveau de carburant critique du groupe électrogène ({$validated['fuel_level_percent']}%)";

                $action = QualityAction::create([
                    'officine_id' => $officineId,
                    'created_by' => $userId,
                    'title' => "Alerte Groupe Électrogène : {$reason}",
                    'chapter' => 'Locaux & Équipements',
                    'severity' => 'high',
                    'owner' => $request->user()?->name ?? 'Responsable Technique',
                    'due_date' => now()->addDays(2)->toDateString(),
                    'status' => 'open',
                    'description' => "Test du {$validated['test_date']} : {$reason}. Commentaire : " . ($validated['comment'] ?? 'Aucun'),
                    'resolution' => '',
                ]);
                $createdActionId = $action->id;
            }

            $test = GeneratorTest::create([
                ...$validated,
                'officine_id' => $officineId,
                'tested_by_user_id' => $request->user()?->id ?? 1,
                'created_action_id' => $createdActionId,
                'version' => 1,
            ]);

            return response()->json(['data' => $test], 201);
        });
    }

    // ==========================================
    // 6. CLEANING PLANS & OCCURRENCES (CDC 3.5)
    // ==========================================

    public function cleaningPlansIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.read');
        $officineId = $this->getOfficineId($request);

        $plans = CleaningPlan::where('officine_id', $officineId)
            ->withCount('occurrences')
            ->orderBy('zone_name')
            ->get();

        return response()->json(['data' => $plans]);
    }

    public function storeCleaningPlan(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'zone_name' => 'required|string|max:150',
            'frequency' => 'required|string|in:quotidien,hebdomadaire,bimensuel,mensuel',
            'cleaning_method' => 'required|string',
            'products_used' => 'nullable|string|max:200',
            'assigned_role' => 'nullable|string|max:100',
            'is_active' => 'sometimes|boolean',
        ]);

        $plan = CleaningPlan::create([
            ...$validated,
            'officine_id' => $officineId,
            'is_active' => $validated['is_active'] ?? true,
            'version' => 1,
        ]);

        return response()->json(['data' => $plan], 201);
    }

    public function cleaningOccurrencesIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.read');
        $officineId = $this->getOfficineId($request);

        $query = CleaningOccurrence::with(['plan:id,zone_name,frequency', 'performedBy:id,name', 'verifiedBy:id,name'])
            ->where('officine_id', $officineId);

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('planned_date', [$request->query('start_date'), $request->query('end_date')]);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $occurrences = $query->orderByDesc('planned_date')->get();
        return response()->json(['data' => $occurrences]);
    }

    public function storeCleaningOccurrence(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'cleaning_plan_id' => 'required|integer',
            'planned_date' => 'required|date',
            'status' => 'required|string|in:realise,non_realise,en_retard',
            'anomalies_detected' => 'nullable|string',
        ]);

        $plan = CleaningPlan::where('officine_id', $officineId)->find($validated['cleaning_plan_id']);
        if (!$plan) {
            return response()->json(['message' => 'Protocole de nettoyage non trouvé.'], 404);
        }

        $occurrence = CleaningOccurrence::create([
            ...$validated,
            'officine_id' => $officineId,
            'performed_at' => $validated['status'] === 'realise' ? now() : null,
            'performed_by_user_id' => $validated['status'] === 'realise' ? $request->user()?->id : null,
            'is_verified' => false,
            'version' => 1,
        ]);

        return response()->json(['data' => $occurrence], 201);
    }

    public function verifyCleaningOccurrence(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.write');
        $officineId = $this->getOfficineId($request);

        $occ = CleaningOccurrence::where('officine_id', $officineId)->find($id);
        if (!$occ) {
            return response()->json(['message' => 'Occurrence non trouvée.'], 404);
        }

        $occ->update([
            'is_verified' => true,
            'verified_by_user_id' => $request->user()?->id,
            'verified_at' => now(),
            'version' => $occ->version + 1,
        ]);

        return response()->json(['data' => $occ]);
    }

    // ==========================================
    // 7. EQUIPMENT WITHDRAWAL (Retrait - CDC 3.6 & 7)
    // ==========================================

    public function withdrawalsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.read');
        $officineId = $this->getOfficineId($request);

        $withdrawals = EquipmentWithdrawal::with(['equipment:id,code,designation,status', 'requestedBy:id,name', 'approvedBy:id,name'])
            ->where('officine_id', $officineId)
            ->orderByDesc('request_date')
            ->get();

        return response()->json(['data' => $withdrawals]);
    }

    public function requestWithdrawal(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'equipment_id' => 'required|integer',
            'request_date' => 'required|date',
            'withdrawal_reason' => 'required|string',
            'destination' => 'required|string|in:reforme,destruction,retour_fournisseur,stockage_mort',
        ]);

        $equipment = Equipment::where('officine_id', $officineId)->find($validated['equipment_id']);
        if (!$equipment) {
            return response()->json(['message' => 'Équipement non trouvé.'], 404);
        }

        // CDC 7 : retrait sans approbation refusé -> on soumet la demande, mais le statut matériel ne change pas encore
        $withdrawal = EquipmentWithdrawal::create([
            ...$validated,
            'officine_id' => $officineId,
            'requested_by_user_id' => $request->user()?->id ?? 1,
            'status' => 'demande',
            'version' => 1,
        ]);

        return response()->json(['data' => $withdrawal], 201);
    }

    public function decideWithdrawal(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'locauxequipements.write');
        $officineId = $this->getOfficineId($request);

        $withdrawal = EquipmentWithdrawal::where('officine_id', $officineId)->find($id);
        if (!$withdrawal) {
            return response()->json(['message' => 'Demande de retrait non trouvée.'], 404);
        }

        if ($withdrawal->status !== 'demande') {
            return response()->json(['message' => 'Cette demande a déjà été statuée.'], 422);
        }

        $validated = $request->validate([
            'decision' => 'required|string|in:approuve,rejete',
            'rejection_reason' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($withdrawal, $validated, $officineId, $request) {
            $equipment = Equipment::where('officine_id', $officineId)->find($withdrawal->equipment_id);

            if ($validated['decision'] === 'approuve') {
                // Changer statut sans supprimer l'équipement (CDC 3.6)
                if ($equipment) {
                    $equipment->update([
                        'status' => 'hors_service',
                        'version' => $equipment->version + 1,
                    ]);
                }
            }

            $withdrawal->update([
                'status' => $validated['decision'],
                'approved_by_user_id' => $request->user()?->id,
                'decided_at' => now(),
                'rejection_reason' => $validated['rejection_reason'] ?? null,
                'version' => $withdrawal->version + 1,
            ]);

            return response()->json(['data' => $withdrawal]);
        });
    }
}

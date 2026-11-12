<?php

declare(strict_types=1);

namespace App\Modules\Paie\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Paie\Models\PaieBareme;
use App\Modules\Paie\Models\PaieBulletin;
use App\Modules\Paie\Models\PaieVariable;
use App\Modules\Paie\Services\PaieService;
use App\Modules\Personnel\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class PaieController extends Controller
{
    public function __construct(private readonly PaieService $service)
    {
    }

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
        if (!in_array($permission, $perms, true) && !in_array('*', $perms, true)) {
            abort(403, 'Permission insuffisante pour cette action.');
        }
    }

    public function overview(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'paie.read');
        $officineId = $this->getOfficineId($request);

        $valideBulletins = PaieBulletin::where('officine_id', $officineId)->whereIn('status', ['valide', 'paye']);

        return response()->json([
            'kpis' => [
                'baremes_actifs' => PaieBareme::where('officine_id', $officineId)->where('is_active', true)->count(),
                'variables_enregistrees' => PaieVariable::where('officine_id', $officineId)->count(),
                'bulletins_brouillon' => PaieBulletin::where('officine_id', $officineId)->where('status', 'brouillon')->count(),
                'bulletins_valides' => (clone $valideBulletins)->count(),
                'masse_brute_validee' => round((float) (clone $valideBulletins)->sum('gross_salary'), 2),
                'masse_nette_validee' => round((float) (clone $valideBulletins)->sum('net_salary'), 2),
                'total_cnss_due' => round(
                    (float) (clone $valideBulletins)->sum('cnss_employee') + (float) (clone $valideBulletins)->sum('cnss_employer'),
                    2
                ),
                'total_its_du' => round((float) (clone $valideBulletins)->sum('its_tax'), 2),
            ],
        ]);
    }

    public function bootstrapBareme(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'paie.write');
        $officineId = $this->getOfficineId($request);

        return response()->json(['data' => $this->service->bootstrapBareme($officineId)], 201);
    }

    // ==========================================
    // 1. BARÈMES DATÉS
    // ==========================================

    public function baremesIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'paie.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => PaieBareme::where('officine_id', $officineId)
                ->orderByDesc('effective_from')
                ->get(),
        ]);
    }

    public function storeBareme(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'paie.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'code' => 'required|string|max:30',
            'label' => 'required|string|max:150',
            'effective_from' => 'required|date',
            'effective_to' => 'nullable|date|after_or_equal:effective_from',
            'cnss_employee_rate' => 'required|numeric|min:0|max:0.5',
            'cnss_employer_rate' => 'required|numeric|min:0|max:0.5',
            'its_rate' => 'required|numeric|min:0|max:0.5',
            'overtime_multiplier' => 'sometimes|numeric|min:1|max:3',
        ]);

        if (PaieBareme::where('officine_id', $officineId)->where('code', $validated['code'])->exists()) {
            return response()->json(['message' => 'Ce code barème existe déjà.'], 422);
        }

        $bareme = PaieBareme::create([
            ...$validated,
            'officine_id' => $officineId,
            'overtime_multiplier' => $validated['overtime_multiplier'] ?? 1.25,
            'is_active' => true,
        ]);

        return response()->json(['data' => $bareme], 201);
    }

    // ==========================================
    // 2. VARIABLES MENSUELLES DE PAIE
    // ==========================================

    public function variablesIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'paie.read');
        $officineId = $this->getOfficineId($request);

        $query = PaieVariable::with('employee:id,matricule,first_name,last_name,role_title')
            ->where('officine_id', $officineId);

        if ($request->filled('period_month')) {
            $query->where('period_month', (string) $request->input('period_month'));
        }

        return response()->json([
            'data' => $query->orderByDesc('period_month')->orderBy('id')->get(),
        ]);
    }

    public function storeVariable(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'paie.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'employee_id' => 'required|integer',
            'period_month' => ['required', 'string', 'regex:/^\d{4}-\d{2}$/'],
            'base_salary' => 'required|numeric|min:0',
            'primes' => 'sometimes|numeric|min:0',
            'overtime_hours' => 'sometimes|numeric|min:0',
            'overtime_hourly_rate' => 'sometimes|numeric|min:0',
            'absences_deduction' => 'sometimes|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        if (!Employee::where('officine_id', $officineId)->where('id', $validated['employee_id'])->exists()) {
            return response()->json(['message' => 'Employé introuvable dans cette officine.'], 404);
        }

        $existing = PaieVariable::where('officine_id', $officineId)
            ->where('employee_id', $validated['employee_id'])
            ->where('period_month', $validated['period_month'])
            ->first();

        if ($existing) {
            $existing->update([
                'base_salary' => $validated['base_salary'],
                'primes' => $validated['primes'] ?? 0,
                'overtime_hours' => $validated['overtime_hours'] ?? 0,
                'overtime_hourly_rate' => $validated['overtime_hourly_rate'] ?? 0,
                'absences_deduction' => $validated['absences_deduction'] ?? 0,
                'notes' => $validated['notes'] ?? null,
                'version' => $existing->version + 1,
            ]);

            return response()->json(['data' => $existing->load('employee:id,matricule,first_name,last_name,role_title')]);
        }

        $variable = PaieVariable::create([
            'officine_id' => $officineId,
            'employee_id' => $validated['employee_id'],
            'period_month' => $validated['period_month'],
            'base_salary' => $validated['base_salary'],
            'primes' => $validated['primes'] ?? 0,
            'overtime_hours' => $validated['overtime_hours'] ?? 0,
            'overtime_hourly_rate' => $validated['overtime_hourly_rate'] ?? 0,
            'absences_deduction' => $validated['absences_deduction'] ?? 0,
            'notes' => $validated['notes'] ?? null,
            'version' => 1,
        ]);

        return response()->json(['data' => $variable->load('employee:id,matricule,first_name,last_name,role_title')], 201);
    }

    // ==========================================
    // 3. BULLETINS DE PAIE & VALIDATION SHA-256
    // ==========================================

    public function bulletinsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'paie.read');
        $officineId = $this->getOfficineId($request);

        $query = PaieBulletin::with(['employee:id,matricule,first_name,last_name,role_title', 'bareme:id,code,label'])
            ->where('officine_id', $officineId);

        if ($request->filled('period_month')) {
            $query->where('period_month', (string) $request->input('period_month'));
        }

        return response()->json([
            'data' => $query->orderByDesc('period_month')->orderByDesc('id')->get(),
        ]);
    }

    public function generateBulletin(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'paie.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'employee_id' => 'required|integer',
            'period_month' => ['required', 'string', 'regex:/^\d{4}-\d{2}$/'],
            'bareme_id' => 'nullable|integer',
            'reference' => 'nullable|string|max:60',
            'idempotency_key' => 'nullable|string|max:120',
        ]);

        if (!empty($validated['idempotency_key'])) {
            $replayed = PaieBulletin::with(['employee:id,matricule,first_name,last_name', 'bareme:id,code,label'])
                ->where('officine_id', $officineId)
                ->where('idempotency_key', $validated['idempotency_key'])
                ->first();
            if ($replayed) {
                return response()->json(['data' => $replayed, 'replayed' => true], 200);
            }
        }

        if (!Employee::where('officine_id', $officineId)->where('id', $validated['employee_id'])->exists()) {
            return response()->json(['message' => 'Employé introuvable dans cette officine.'], 404);
        }

        $variable = PaieVariable::where('officine_id', $officineId)
            ->where('employee_id', $validated['employee_id'])
            ->where('period_month', $validated['period_month'])
            ->first();
        if (!$variable) {
            return response()->json(['message' => 'Aucune variable de paie saisie pour cet employé sur cette période.'], 422);
        }

        if (!empty($validated['bareme_id'])) {
            $bareme = PaieBareme::where('officine_id', $officineId)->find($validated['bareme_id']);
            if (!$bareme) {
                return response()->json(['message' => 'Barème introuvable dans cette officine.'], 404);
            }
        } else {
            $bareme = $this->service->resolveApplicableBareme($officineId, $validated['period_month']);
            if (!$bareme) {
                return response()->json(['message' => 'Aucun barème daté actif ne couvre cette période.'], 422);
            }
        }

        $existing = PaieBulletin::with(['employee:id,matricule,first_name,last_name', 'bareme:id,code,label'])
            ->where('officine_id', $officineId)
            ->where('employee_id', $validated['employee_id'])
            ->where('period_month', $validated['period_month'])
            ->first();
        if ($existing) {
            return response()->json(['data' => $existing, 'replayed' => true], 200);
        }

        $amounts = $this->service->computeAmounts($variable, $bareme);
        $ref = $validated['reference'] ?? "BP-{$validated['period_month']}-E{$validated['employee_id']}";

        $bulletin = PaieBulletin::create([
            'officine_id' => $officineId,
            'employee_id' => $validated['employee_id'],
            'bareme_id' => $bareme->id,
            'period_month' => $validated['period_month'],
            'reference' => $ref,
            'idempotency_key' => $validated['idempotency_key'] ?? null,
            ...$amounts,
            'status' => 'brouillon',
            'version' => 1,
        ]);

        return response()->json([
            'data' => $bulletin->load(['employee:id,matricule,first_name,last_name,role_title', 'bareme:id,code,label']),
        ], 201);
    }

    public function validateBulletin(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'paie.write');
        $officineId = $this->getOfficineId($request);

        return DB::transaction(function () use ($officineId, $id, $request) {
            $bulletin = PaieBulletin::where('officine_id', $officineId)->lockForUpdate()->find($id);
            if (!$bulletin) {
                return response()->json(['message' => 'Bulletin de paie introuvable.'], 404);
            }
            if ($bulletin->status !== 'brouillon') {
                return response()->json(['message' => 'Seul un bulletin en brouillon peut être validé.'], 422);
            }

            $hash = hash(
                'sha256',
                "{$officineId}|{$bulletin->reference}|{$bulletin->period_month}|{$bulletin->gross_salary}|{$bulletin->net_salary}"
            );

            $bulletin->update([
                'status' => 'valide',
                'validated_by_user_id' => $request->user()?->id,
                'validated_at' => now(),
                'bulletin_hash' => $hash,
                'version' => $bulletin->version + 1,
            ]);

            return response()->json([
                'data' => $bulletin->load(['employee:id,matricule,first_name,last_name,role_title', 'bareme:id,code,label']),
            ]);
        });
    }

    public function markPaid(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'paie.write');
        $officineId = $this->getOfficineId($request);

        return DB::transaction(function () use ($officineId, $id) {
            $bulletin = PaieBulletin::where('officine_id', $officineId)->lockForUpdate()->find($id);
            if (!$bulletin) {
                return response()->json(['message' => 'Bulletin de paie introuvable.'], 404);
            }
            if ($bulletin->status !== 'valide') {
                return response()->json(['message' => 'Le bulletin doit être validé avant paiement.'], 422);
            }

            $bulletin->update([
                'status' => 'paye',
                'version' => $bulletin->version + 1,
            ]);

            return response()->json([
                'data' => $bulletin->load(['employee:id,matricule,first_name,last_name,role_title', 'bareme:id,code,label']),
            ]);
        });
    }

    // ==========================================
    // 4. ÉTATS PRÉPARATOIRES CNSS & ITS + EXPORT CSV
    // ==========================================

    public function declarations(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'paie.read');
        $officineId = $this->getOfficineId($request);
        $period = $request->filled('period_month') ? (string) $request->input('period_month') : null;

        return response()->json([
            'data' => $this->service->buildDeclarations($officineId, $period),
        ]);
    }

    public function exportDeclarationsCsv(Request $request): Response
    {
        $this->checkPermission($request, 'paie.read');
        $officineId = $this->getOfficineId($request);
        $period = $request->filled('period_month') ? (string) $request->input('period_month') : null;

        $rows = $this->service->buildDeclarations($officineId, $period);
        $lines = ["periode;nb_bulletins;masse_brute;cnss_salariale;cnss_patronale;cnss_totale;its_du;net_a_payer"];
        foreach ($rows as $r) {
            $lines[] = implode(';', [
                $r['period_month'],
                $r['bulletins_count'],
                number_format((float) $r['total_gross'], 2, '.', ''),
                number_format((float) $r['total_cnss_employee'], 2, '.', ''),
                number_format((float) $r['total_cnss_employer'], 2, '.', ''),
                number_format((float) $r['total_cnss_due'], 2, '.', ''),
                number_format((float) $r['total_its'], 2, '.', ''),
                number_format((float) $r['total_net'], 2, '.', ''),
            ]);
        }

        return response(implode("\n", $lines), 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="etats-paie-cnss-its.csv"',
        ]);
    }
}

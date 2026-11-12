<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RemainingCdcController extends Controller
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
        if (!in_array($permission, $perms, true) && !in_array('*', $perms, true)) {
            abort(403, 'Permission insuffisante pour cette action.');
        }
    }

    // ==========================================
    // 1. REGISTRE STUPÉFIANTS TABLEAU B
    // ==========================================

    public function stupefiantsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => DB::table('cdc_stupefiants_entries')
                ->where('officine_id', $officineId)
                ->orderByDesc('entry_date')
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function storeStupefiant(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'entry_date' => 'required|date',
            'movement_type' => 'required|string|in:entree,sortie,destruction',
            'substance_name' => 'required|string|max:150',
            'lot_number' => 'required|string|max:80',
            'quantity' => 'required|numeric|min:0.01',
            'unit' => 'sometimes|string|max:30',
            'prescription_ref' => 'nullable|string|max:80',
            'patient_name' => 'nullable|string|max:150',
            'prescriber_name' => 'nullable|string|max:150',
            'pharmacist_visa' => 'nullable|string|max:120',
        ]);

        $hash = hash(
            'sha256',
            "{$officineId}|{$validated['entry_date']}|{$validated['movement_type']}|{$validated['substance_name']}|{$validated['lot_number']}|{$validated['quantity']}"
        );

        $id = DB::table('cdc_stupefiants_entries')->insertGetId([
            'officine_id' => $officineId,
            'entry_date' => $validated['entry_date'],
            'movement_type' => $validated['movement_type'],
            'substance_name' => $validated['substance_name'],
            'lot_number' => $validated['lot_number'],
            'quantity' => $validated['quantity'],
            'unit' => $validated['unit'] ?? 'Unité',
            'prescription_ref' => $validated['prescription_ref'] ?? null,
            'patient_name' => $validated['patient_name'] ?? null,
            'prescriber_name' => $validated['prescriber_name'] ?? null,
            'pharmacist_visa' => $validated['pharmacist_visa'] ?? ($request->user()?->name ?? 'Pharmacien'),
            'entry_hash' => $hash,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'data' => DB::table('cdc_stupefiants_entries')->where('id', $id)->first(),
        ], 201);
    }

    // ==========================================
    // 2. PRÉPARATIONS MAGISTRALES
    // ==========================================

    public function preparationsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => DB::table('cdc_preparations')
                ->where('officine_id', $officineId)
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function storePreparation(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'reference' => 'required|string|max:60',
            'formula_name' => 'required|string|max:180',
            'patient_name' => 'nullable|string|max:150',
            'prescriber_name' => 'nullable|string|max:150',
            'ingredients' => 'nullable|array',
            'quantity_prepared' => 'required|string|max:60',
            'expiry_date' => 'required|date',
        ]);

        if (DB::table('cdc_preparations')->where('officine_id', $officineId)->where('reference', $validated['reference'])->exists()) {
            return response()->json(['message' => 'Cette référence de préparation existe déjà.'], 422);
        }

        $id = DB::table('cdc_preparations')->insertGetId([
            'officine_id' => $officineId,
            'reference' => $validated['reference'],
            'formula_name' => $validated['formula_name'],
            'patient_name' => $validated['patient_name'] ?? null,
            'prescriber_name' => $validated['prescriber_name'] ?? null,
            'ingredients' => json_encode($validated['ingredients'] ?? []),
            'quantity_prepared' => $validated['quantity_prepared'],
            'expiry_date' => $validated['expiry_date'],
            'status' => 'en_preparation',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'data' => DB::table('cdc_preparations')->where('id', $id)->first(),
        ], 201);
    }

    public function releasePreparation(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $prep = DB::table('cdc_preparations')->where('officine_id', $officineId)->where('id', $id)->first();
        if (!$prep) {
            return response()->json(['message' => 'Préparation introuvable.'], 404);
        }

        $hash = hash('sha256', "{$officineId}|{$prep->reference}|{$prep->formula_name}|released");
        DB::table('cdc_preparations')->where('id', $id)->update([
            'status' => 'delivree',
            'control_hash' => $hash,
            'controlled_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['data' => DB::table('cdc_preparations')->where('id', $id)->first()]);
    }

    // ==========================================
    // 3. MODÈLES TYPES BPD (59)
    // ==========================================

    public function bpdModelsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => DB::table('cdc_bpd_templates')
                ->where('officine_id', $officineId)
                ->orderBy('code')
                ->get(),
        ]);
    }

    public function bootstrapBpdModels(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $categories = [
            'Système Qualité & Audits',
            'Personnel & Hygiène',
            'Locaux & Équipements',
            'Achats & Réceptions',
            'Stockage & Chaîne du Froid',
            'Dispensation & Vigilance',
        ];

        $created = 0;
        for ($i = 1; $i <= 59; $i++) {
            $code = sprintf('BPD-%02d', $i);
            $exists = DB::table('cdc_bpd_templates')
                ->where('officine_id', $officineId)
                ->where('code', $code)
                ->exists();
            if ($exists) {
                continue;
            }
            $cat = $categories[($i - 1) % count($categories)];
            DB::table('cdc_bpd_templates')->insert([
                'officine_id' => $officineId,
                'code' => $code,
                'title' => "Modèle Type Officinal {$code} — {$cat}",
                'category' => $cat,
                'bpd_reference' => 'Art. ' . (1 + intdiv($i - 1, 10)) . '.' . ((($i - 1) % 10) + 1),
                'is_adopted' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $created++;
        }

        return response()->json(['created' => $created], 201);
    }

    public function adoptBpdModel(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $row = DB::table('cdc_bpd_templates')->where('officine_id', $officineId)->where('id', $id)->first();
        if (!$row) {
            return response()->json(['message' => 'Modèle BPD introuvable.'], 404);
        }

        DB::table('cdc_bpd_templates')->where('id', $id)->update([
            'is_adopted' => true,
            'adopted_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['data' => DB::table('cdc_bpd_templates')->where('id', $id)->first()]);
    }

    // ==========================================
    // 4. AUTO-ÉVALUATION 267 ARTICLES BPD
    // ==========================================

    public function autoevalIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => DB::table('cdc_autoeval_campaigns')
                ->where('officine_id', $officineId)
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function storeAutoeval(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'reference' => 'required|string|max:60',
            'title' => 'required|string|max:180',
            'total_articles' => 'sometimes|integer|min:1|max:500',
            'compliant_count' => 'required|integer|min:0',
            'non_compliant_count' => 'required|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        $total = (int) ($validated['total_articles'] ?? 267);
        $evaluated = $validated['compliant_count'] + $validated['non_compliant_count'];
        if ($evaluated > $total) {
            return response()->json(['message' => 'La somme conforme + non-conforme dépasse le total d’articles.'], 422);
        }

        $score = $evaluated > 0 ? round(($validated['compliant_count'] / $total) * 100, 2) : 0.0;

        $id = DB::table('cdc_autoeval_campaigns')->insertGetId([
            'officine_id' => $officineId,
            'reference' => $validated['reference'],
            'title' => $validated['title'],
            'total_articles' => $total,
            'compliant_count' => $validated['compliant_count'],
            'non_compliant_count' => $validated['non_compliant_count'],
            'score_percent' => $score,
            'status' => $evaluated === $total ? 'cloturee' : 'en_cours',
            'notes' => $validated['notes'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['data' => DB::table('cdc_autoeval_campaigns')->where('id', $id)->first()], 201);
    }

    // ==========================================
    // 5. POINTAGE PRÉSENCE (ART 1.11)
    // ==========================================

    public function presenceIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => DB::table('cdc_presence_logs')
                ->where('officine_id', $officineId)
                ->orderByDesc('work_date')
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function storePresence(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'staff_name' => 'required|string|max:150',
            'role_badge' => 'required|string|max:80',
            'work_date' => 'required|date',
            'check_in_at' => 'required|string|max:10',
            'check_out_at' => 'nullable|string|max:10',
            'pharmacist_present' => 'sometimes|boolean',
            'notes' => 'nullable|string|max:255',
        ]);

        $id = DB::table('cdc_presence_logs')->insertGetId([
            'officine_id' => $officineId,
            'staff_name' => $validated['staff_name'],
            'role_badge' => $validated['role_badge'],
            'work_date' => $validated['work_date'],
            'check_in_at' => $validated['check_in_at'],
            'check_out_at' => $validated['check_out_at'] ?? null,
            'pharmacist_present' => $validated['pharmacist_present'] ?? true,
            'notes' => $validated['notes'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['data' => DB::table('cdc_presence_logs')->where('id', $id)->first()], 201);
    }

    // ==========================================
    // 6. ÉCHÉANCIER RÉGLEMENTAIRE
    // ==========================================

    public function deadlinesIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => DB::table('cdc_regulatory_deadlines')
                ->where('officine_id', $officineId)
                ->orderBy('due_date')
                ->get(),
        ]);
    }

    public function storeDeadline(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'reference' => 'required|string|max:60',
            'title' => 'required|string|max:180',
            'authority' => 'required|string|in:ABRP,DGI,CNSS,Ordre,Inspection',
            'due_date' => 'required|date',
            'proof_ref' => 'nullable|string|max:120',
        ]);

        if (DB::table('cdc_regulatory_deadlines')->where('officine_id', $officineId)->where('reference', $validated['reference'])->exists()) {
            return response()->json(['message' => 'Cette référence d’échéance existe déjà.'], 422);
        }

        $id = DB::table('cdc_regulatory_deadlines')->insertGetId([
            'officine_id' => $officineId,
            'reference' => $validated['reference'],
            'title' => $validated['title'],
            'authority' => $validated['authority'],
            'due_date' => $validated['due_date'],
            'status' => 'a_venir',
            'proof_ref' => $validated['proof_ref'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['data' => DB::table('cdc_regulatory_deadlines')->where('id', $id)->first()], 201);
    }

    public function closeDeadline(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $row = DB::table('cdc_regulatory_deadlines')->where('officine_id', $officineId)->where('id', $id)->first();
        if (!$row) {
            return response()->json(['message' => 'Échéance introuvable.'], 404);
        }

        DB::table('cdc_regulatory_deadlines')->where('id', $id)->update([
            'status' => 'cloturee',
            'proof_ref' => $request->input('proof_ref', $row->proof_ref),
            'updated_at' => now(),
        ]);

        return response()->json(['data' => DB::table('cdc_regulatory_deadlines')->where('id', $id)->first()]);
    }
}

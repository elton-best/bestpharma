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

    public function stupefiantsBalance(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        $entries = DB::table('cdc_stupefiants_entries')
            ->where('officine_id', $officineId)
            ->orderBy('entry_date')
            ->get();

        $bySubstance = [];
        $totalEntrees = 0.0;
        $totalSorties = 0.0;
        $totalDestructions = 0.0;

        foreach ($entries as $e) {
            $sub = $e->substance_name;
            if (!isset($bySubstance[$sub])) {
                $bySubstance[$sub] = [
                    'substance_name' => $sub,
                    'unit' => $e->unit ?? 'Unité',
                    'entrees' => 0.0,
                    'sorties' => 0.0,
                    'destructions' => 0.0,
                    'solde' => 0.0,
                    'lots' => [],
                ];
            }
            $qty = (float) $e->quantity;
            if ($e->movement_type === 'entree') {
                $bySubstance[$sub]['entrees'] += $qty;
                $bySubstance[$sub]['solde'] += $qty;
                $totalEntrees += $qty;
            } elseif ($e->movement_type === 'sortie') {
                $bySubstance[$sub]['sorties'] += $qty;
                $bySubstance[$sub]['solde'] -= $qty;
                $totalSorties += $qty;
            } elseif ($e->movement_type === 'destruction') {
                $bySubstance[$sub]['destructions'] += $qty;
                $bySubstance[$sub]['solde'] -= $qty;
                $totalDestructions += $qty;
            }
            if (!in_array($e->lot_number, $bySubstance[$sub]['lots'], true)) {
                $bySubstance[$sub]['lots'][] = $e->lot_number;
            }
        }

        return response()->json([
            'data' => array_values($bySubstance),
            'summary' => [
                'total_entrees' => round($totalEntrees, 2),
                'total_sorties' => round($totalSorties, 2),
                'total_destructions' => round($totalDestructions, 2),
                'solde_global' => round($totalEntrees - $totalSorties - $totalDestructions, 2),
                'substances_count' => count($bySubstance),
            ],
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

    public function destroyStupefiant(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'entry_date' => 'required|date',
            'substance_name' => 'required|string|max:150',
            'lot_number' => 'required|string|max:80',
            'quantity' => 'required|numeric|min:0.01',
            'unit' => 'sometimes|string|max:30',
            'titulaire_visa' => 'required|string|max:120',
            'witness_visa' => 'required|string|max:120',
            'witness_role' => 'required|string|max:80',
            'destruction_method' => 'required|string|max:120',
            'notes' => 'nullable|string',
        ]);

        $pvRef = 'PV-DEST-' . date('Y') . '-' . strtoupper(bin2hex(random_bytes(3)));
        $hash = hash(
            'sha256',
            "{$officineId}|{$validated['entry_date']}|destruction|{$validated['substance_name']}|{$validated['lot_number']}|{$validated['quantity']}|{$validated['titulaire_visa']}|{$validated['witness_visa']}"
        );

        $id = DB::table('cdc_stupefiants_entries')->insertGetId([
            'officine_id' => $officineId,
            'entry_date' => $validated['entry_date'],
            'movement_type' => 'destruction',
            'substance_name' => $validated['substance_name'],
            'lot_number' => $validated['lot_number'],
            'quantity' => $validated['quantity'],
            'unit' => $validated['unit'] ?? 'Unité',
            'prescription_ref' => $pvRef,
            'patient_name' => "PV: {$pvRef} (Témoin: {$validated['witness_visa']}, Méthode: {$validated['destruction_method']})",
            'prescriber_name' => "Double visa: Titulaire ({$validated['titulaire_visa']}) / Témoin ({$validated['witness_visa']})",
            'pharmacist_visa' => $validated['titulaire_visa'],
            'entry_hash' => $hash,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'data' => DB::table('cdc_stupefiants_entries')->where('id', $id)->first(),
            'pv_reference' => $pvRef,
            'message' => 'Procès-Verbal de destruction émis et scellé.',
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

        $validated = $request->validate([
            'pharmacist_visa' => 'nullable|string|max:120',
            'posology_verified' => 'sometimes|boolean',
            'organoleptic_check' => 'sometimes|boolean',
            'packaging_compliant' => 'sometimes|boolean',
        ]);

        $visa = $validated['pharmacist_visa'] ?? ($request->user()?->name ?? 'Pharmacien Titulaire');
        $hash = hash('sha256', "{$officineId}|{$prep->reference}|{$prep->formula_name}|released|{$visa}|" . now()->toIso8601String());

        DB::table('cdc_preparations')->where('id', $id)->update([
            'status' => 'delivree',
            'control_hash' => $hash,
            'controlled_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'data' => DB::table('cdc_preparations')->where('id', $id)->first(),
            'control_hash' => $hash,
            'visa' => $visa,
        ]);
    }

    public function preparationLabel(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);

        $prep = DB::table('cdc_preparations')->where('officine_id', $officineId)->where('id', $id)->first();
        if (!$prep) {
            return response()->json(['message' => 'Préparation introuvable.'], 404);
        }

        $officine = DB::table('officines')->where('id', $officineId)->first();

        return response()->json([
            'data' => [
                'preparation_id' => $prep->id,
                'reference' => $prep->reference,
                'formula_name' => $prep->formula_name,
                'patient_name' => $prep->patient_name ?? 'Usage externe / Prescription',
                'prescriber_name' => $prep->prescriber_name ?? 'Médecin Prescripteur',
                'quantity_prepared' => $prep->quantity_prepared,
                'expiry_date' => $prep->expiry_date,
                'status' => $prep->status,
                'control_hash' => $prep->control_hash,
                'officine_name' => $officine?->name ?? 'Pharmacie Officinale',
                'officine_city' => $officine?->city ?? 'Bénin',
                'regulatory_mentions' => [
                    'Usage pharmaceutique sous contrôle d un pharmacien',
                    'Conserver à l abri de la chaleur et de l humidité',
                    'Ne pas dépasser la dose prescrite',
                    'Tenir hors de portée des enfants',
                ],
            ],
        ]);
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

    public function autoevalCreateCapa(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'qualite.write');
        $officineId = $this->getOfficineId($request);

        $campaign = DB::table('cdc_autoeval_campaigns')->where('officine_id', $officineId)->where('id', $id)->first();
        if (!$campaign) {
            return response()->json(['message' => 'Campagne introuvable.'], 404);
        }

        $validated = $request->validate([
            'article_code' => 'required|string|max:50',
            'chapter' => 'required|string|max:100',
            'severity' => 'required|string|in:low,medium,high,critical',
            'description' => 'required|string',
            'due_date' => 'required|date',
            'owner' => 'required|string|max:120',
        ]);

        $action = \App\Modules\Qualite\Models\QualityAction::create([
            'officine_id' => $officineId,
            'created_by' => $request->user()?->id ?? 1,
            'title' => "Écart BPD {$validated['article_code']} — Campagne {$campaign->reference}",
            'chapter' => $validated['chapter'],
            'severity' => $validated['severity'],
            'owner' => $validated['owner'],
            'due_date' => $validated['due_date'],
            'status' => 'open',
            'description' => $validated['description'],
            'resolution' => '',
        ]);

        return response()->json([
            'data' => $action,
            'message' => 'Action corrective CAPA créée et rattachée à l auto-évaluation.',
        ], 201);
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

    public function pharmacistPresenceStatus(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'qualite.read');
        $officineId = $this->getOfficineId($request);
        $today = date('Y-m-d');

        $activePharmacists = DB::table('cdc_presence_logs')
            ->where('officine_id', $officineId)
            ->where('work_date', $today)
            ->where('pharmacist_present', true)
            ->whereNull('check_out_at')
            ->get();

        $isPresent = $activePharmacists->isNotEmpty();

        return response()->json([
            'data' => [
                'pharmacist_present' => $isPresent,
                'status' => $isPresent ? 'conforme' : 'alerte_absence',
                'active_count' => $activePharmacists->count(),
                'pharmacists' => $activePharmacists->pluck('staff_name'),
                'as_of' => now()->toIso8601String(),
                'article_rule' => 'Art. 1.11 BPD ABMed — Présence physique continue d un pharmacien',
            ],
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

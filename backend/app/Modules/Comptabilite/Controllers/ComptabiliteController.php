<?php

declare(strict_types=1);

namespace App\Modules\Comptabilite\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Comptabilite\Models\ComptaCompte;
use App\Modules\Comptabilite\Models\ComptaEcriture;
use App\Modules\Comptabilite\Models\ComptaEcritureLigne;
use App\Modules\Comptabilite\Models\ComptaExercice;
use App\Modules\Comptabilite\Models\ComptaJournal;
use App\Modules\Comptabilite\Services\ComptabiliteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class ComptabiliteController extends Controller
{
    public function __construct(private readonly ComptabiliteService $service)
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
        $this->checkPermission($request, 'comptabilite.read');
        $officineId = $this->getOfficineId($request);

        $valideesQuery = ComptaEcriture::where('officine_id', $officineId)->where('status', 'validee');
        $totalDebit = round((float) (clone $valideesQuery)->sum('total_debit'), 2);
        $totalCredit = round((float) (clone $valideesQuery)->sum('total_credit'), 2);

        return response()->json([
            'kpis' => [
                'exercices_ouverts' => ComptaExercice::where('officine_id', $officineId)->where('status', 'ouvert')->count(),
                'journaux_actifs' => ComptaJournal::where('officine_id', $officineId)->where('is_active', true)->count(),
                'comptes_actifs' => ComptaCompte::where('officine_id', $officineId)->where('is_active', true)->count(),
                'ecritures_brouillon' => ComptaEcriture::where('officine_id', $officineId)->where('status', 'brouillon')->count(),
                'ecritures_validees' => (clone $valideesQuery)->count(),
                'total_debit_valide' => $totalDebit,
                'total_credit_valide' => $totalCredit,
                'equilibre_general' => abs($totalDebit - $totalCredit) < 0.01,
            ],
        ]);
    }

    public function bootstrapPlan(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'comptabilite.write');
        $officineId = $this->getOfficineId($request);

        $result = $this->service->bootstrapOfficine($officineId);

        return response()->json(['data' => $result], 201);
    }

    public function syncOperations(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'comptabilite.write');
        $officineId = $this->getOfficineId($request);

        $result = $this->service->syncFromOperations($officineId, $request->user()?->id);

        return response()->json(['data' => $result]);
    }

    // ==========================================
    // 1. EXERCICES COMPTABLES
    // ==========================================

    public function exercicesIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'comptabilite.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => ComptaExercice::where('officine_id', $officineId)
                ->orderByDesc('start_date')
                ->get(),
        ]);
    }

    public function storeExercice(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'comptabilite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'code' => 'required|string|max:20',
            'label' => 'required|string|max:120',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
        ]);

        if (ComptaExercice::where('officine_id', $officineId)->where('code', $validated['code'])->exists()) {
            return response()->json(['message' => 'Ce code exercice existe déjà.'], 422);
        }

        $exercice = ComptaExercice::create([
            ...$validated,
            'officine_id' => $officineId,
            'status' => 'ouvert',
            'version' => 1,
        ]);

        return response()->json(['data' => $exercice], 201);
    }

    public function closeExercice(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'comptabilite.write');
        $officineId = $this->getOfficineId($request);

        return DB::transaction(function () use ($officineId, $id, $request) {
            $exercice = ComptaExercice::where('officine_id', $officineId)->lockForUpdate()->find($id);
            if (!$exercice) {
                return response()->json(['message' => 'Exercice comptable introuvable.'], 404);
            }
            if ($exercice->status === 'cloture') {
                return response()->json(['message' => 'Cet exercice est déjà clôturé.'], 422);
            }

            $draftCount = ComptaEcriture::where('officine_id', $officineId)
                ->where('exercice_id', $exercice->id)
                ->where('status', 'brouillon')
                ->count();
            if ($draftCount > 0) {
                return response()->json([
                    'message' => "Clôture impossible : {$draftCount} écriture(s) en brouillon subsistent sur cet exercice.",
                ], 422);
            }

            $exercice->update([
                'status' => 'cloture',
                'closed_at' => now(),
                'closed_by_user_id' => $request->user()?->id,
                'version' => $exercice->version + 1,
            ]);

            return response()->json(['data' => $exercice]);
        });
    }

    // ==========================================
    // 2. PLAN COMPTABLE & JOURNAUX SYSCOHADA
    // ==========================================

    public function comptesIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'comptabilite.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => ComptaCompte::where('officine_id', $officineId)
                ->orderBy('code')
                ->get(),
        ]);
    }

    public function storeCompte(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'comptabilite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'code' => 'required|string|max:20',
            'label' => 'required|string|max:180',
            'classe' => 'required|integer|min:1|max:8',
            'nature' => 'required|string|in:actif,passif,charge,produit',
        ]);

        if (ComptaCompte::where('officine_id', $officineId)->where('code', $validated['code'])->exists()) {
            return response()->json(['message' => 'Ce numéro de compte SYSCOHADA existe déjà.'], 422);
        }

        $compte = ComptaCompte::create([
            ...$validated,
            'officine_id' => $officineId,
            'is_active' => true,
        ]);

        return response()->json(['data' => $compte], 201);
    }

    public function journauxIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'comptabilite.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => ComptaJournal::where('officine_id', $officineId)
                ->orderBy('code')
                ->get(),
        ]);
    }

    public function storeJournal(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'comptabilite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'code' => 'required|string|max:15',
            'name' => 'required|string|max:120',
            'journal_type' => 'required|string|in:ventes,achats,caisse,banque,operations_diverses',
        ]);

        $code = strtoupper($validated['code']);
        if (ComptaJournal::where('officine_id', $officineId)->where('code', $code)->exists()) {
            return response()->json(['message' => 'Ce code journal existe déjà.'], 422);
        }

        $journal = ComptaJournal::create([
            'officine_id' => $officineId,
            'code' => $code,
            'name' => $validated['name'],
            'journal_type' => $validated['journal_type'],
            'is_active' => true,
        ]);

        return response()->json(['data' => $journal], 201);
    }

    // ==========================================
    // 3. ÉCRITURES COMPTABLES & SCELLEMENT SHA-256
    // ==========================================

    public function ecrituresIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'comptabilite.read');
        $officineId = $this->getOfficineId($request);

        $query = ComptaEcriture::with(['exercice:id,code,status', 'journal:id,code,name', 'lignes.compte:id,code,label'])
            ->where('officine_id', $officineId);

        if ($request->filled('exercice_id')) {
            $query->where('exercice_id', (int) $request->input('exercice_id'));
        }
        if ($request->filled('journal_id')) {
            $query->where('journal_id', (int) $request->input('journal_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', (string) $request->input('status'));
        }

        return response()->json([
            'data' => $query->orderByDesc('entry_date')->orderByDesc('id')->get(),
        ]);
    }

    public function storeEcriture(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'comptabilite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'exercice_id' => 'required|integer',
            'journal_id' => 'required|integer',
            'reference' => 'required|string|max:60',
            'entry_date' => 'required|date',
            'label' => 'required|string|max:255',
            'idempotency_key' => 'nullable|string|max:120',
            'lignes' => 'required|array|min:2',
            'lignes.*.compte_id' => 'required|integer',
            'lignes.*.label' => 'required|string|max:255',
            'lignes.*.debit' => 'required|numeric|min:0',
            'lignes.*.credit' => 'required|numeric|min:0',
            'lignes.*.third_party_ref' => 'nullable|string|max:80',
        ]);

        if (!empty($validated['idempotency_key'])) {
            $replayed = ComptaEcriture::with(['lignes.compte:id,code,label'])
                ->where('officine_id', $officineId)
                ->where('idempotency_key', $validated['idempotency_key'])
                ->first();
            if ($replayed) {
                return response()->json(['data' => $replayed, 'replayed' => true], 200);
            }
        }

        if (ComptaEcriture::where('officine_id', $officineId)->where('reference', $validated['reference'])->exists()) {
            return response()->json(['message' => 'Cette référence d’écriture existe déjà.'], 422);
        }

        $exercice = ComptaExercice::where('officine_id', $officineId)->find($validated['exercice_id']);
        if (!$exercice) {
            return response()->json(['message' => 'Exercice introuvable dans cette officine.'], 404);
        }
        if ($exercice->status !== 'ouvert') {
            return response()->json(['message' => 'Impossible d’enregistrer une écriture sur un exercice clôturé.'], 422);
        }

        if (!ComptaJournal::where('officine_id', $officineId)->where('id', $validated['journal_id'])->exists()) {
            return response()->json(['message' => 'Journal introuvable dans cette officine.'], 404);
        }

        $compteIds = array_values(array_unique(array_map(fn ($l) => (int) $l['compte_id'], $validated['lignes'])));
        if (ComptaCompte::where('officine_id', $officineId)->whereIn('id', $compteIds)->count() !== count($compteIds)) {
            return response()->json(['message' => 'Un ou plusieurs comptes SYSCOHADA sont introuvables dans cette officine.'], 404);
        }

        $totalDebit = 0.0;
        $totalCredit = 0.0;
        foreach ($validated['lignes'] as $ligne) {
            $d = round((float) $ligne['debit'], 2);
            $c = round((float) $ligne['credit'], 2);
            if (($d <= 0 && $c <= 0) || ($d > 0 && $c > 0)) {
                return response()->json(['message' => 'Chaque ligne doit comporter exclusivement un débit ou un crédit positif.'], 422);
            }
            $totalDebit += $d;
            $totalCredit += $c;
        }

        $totalDebit = round($totalDebit, 2);
        $totalCredit = round($totalCredit, 2);
        if ($totalDebit <= 0 || abs($totalDebit - $totalCredit) >= 0.01) {
            return response()->json([
                'message' => "Écriture déséquilibrée : Débit ({$totalDebit}) ≠ Crédit ({$totalCredit}).",
            ], 422);
        }

        return DB::transaction(function () use ($validated, $officineId, $totalDebit, $totalCredit, $request) {
            $ecriture = ComptaEcriture::create([
                'officine_id' => $officineId,
                'exercice_id' => $validated['exercice_id'],
                'journal_id' => $validated['journal_id'],
                'reference' => $validated['reference'],
                'entry_date' => $validated['entry_date'],
                'label' => $validated['label'],
                'source_type' => 'manual',
                'idempotency_key' => $validated['idempotency_key'] ?? null,
                'status' => 'brouillon',
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'created_by_user_id' => $request->user()?->id ?? 1,
                'version' => 1,
            ]);

            foreach ($validated['lignes'] as $idx => $ligne) {
                ComptaEcritureLigne::create([
                    'officine_id' => $officineId,
                    'ecriture_id' => $ecriture->id,
                    'compte_id' => $ligne['compte_id'],
                    'line_order' => $idx + 1,
                    'label' => $ligne['label'],
                    'debit' => round((float) $ligne['debit'], 2),
                    'credit' => round((float) $ligne['credit'], 2),
                    'third_party_ref' => $ligne['third_party_ref'] ?? null,
                ]);
            }

            return response()->json([
                'data' => $ecriture->load(['exercice:id,code', 'journal:id,code,name', 'lignes.compte:id,code,label']),
            ], 201);
        });
    }

    public function validateEcriture(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'comptabilite.write');
        $officineId = $this->getOfficineId($request);

        return DB::transaction(function () use ($officineId, $id, $request) {
            $ecriture = ComptaEcriture::with('lignes')
                ->where('officine_id', $officineId)
                ->lockForUpdate()
                ->find($id);

            if (!$ecriture) {
                return response()->json(['message' => 'Écriture comptable introuvable.'], 404);
            }
            if ($ecriture->status === 'validee') {
                return response()->json(['message' => 'Cette écriture est déjà validée et scellée.'], 422);
            }

            $sumD = round((float) $ecriture->lignes->sum('debit'), 2);
            $sumC = round((float) $ecriture->lignes->sum('credit'), 2);
            if ($sumD <= 0 || abs($sumD - $sumC) >= 0.01) {
                return response()->json(['message' => 'Écriture déséquilibrée : validation refusée.'], 422);
            }

            $hashPayload = "{$officineId}|{$ecriture->reference}|{$ecriture->entry_date->toDateString()}|{$sumD}|{$sumC}";
            $ecriture->update([
                'status' => 'validee',
                'validated_by_user_id' => $request->user()?->id,
                'validated_at' => now(),
                'entry_hash' => hash('sha256', $hashPayload),
                'version' => $ecriture->version + 1,
            ]);

            return response()->json([
                'data' => $ecriture->load(['exercice:id,code', 'journal:id,code,name', 'lignes.compte:id,code,label']),
            ]);
        });
    }

    // ==========================================
    // 4. GRAND-LIVRE & BALANCE GÉNÉRALE + EXPORT CSV
    // ==========================================

    public function grandLivre(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'comptabilite.read');
        $officineId = $this->getOfficineId($request);

        $query = ComptaEcritureLigne::query()
            ->join('compta_ecritures as e', 'e.id', '=', 'compta_ecriture_lignes.ecriture_id')
            ->join('compta_comptes as c', 'c.id', '=', 'compta_ecriture_lignes.compte_id')
            ->join('compta_journaux as j', 'j.id', '=', 'e.journal_id')
            ->where('compta_ecriture_lignes.officine_id', $officineId)
            ->where('e.officine_id', $officineId)
            ->where('e.status', 'validee');

        if ($request->filled('compte_id')) {
            $query->where('compta_ecriture_lignes.compte_id', (int) $request->input('compte_id'));
        }
        if ($request->filled('exercice_id')) {
            $query->where('e.exercice_id', (int) $request->input('exercice_id'));
        }

        $lines = $query
            ->select([
                'compta_ecriture_lignes.id',
                'e.entry_date',
                'e.reference',
                'j.code as journal_code',
                'c.code as compte_code',
                'c.label as compte_label',
                'compta_ecriture_lignes.label',
                'compta_ecriture_lignes.debit',
                'compta_ecriture_lignes.credit',
            ])
            ->orderBy('c.code')
            ->orderBy('e.entry_date')
            ->orderBy('e.id')
            ->get();

        return response()->json(['data' => $lines]);
    }

    public function balance(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'comptabilite.read');
        $officineId = $this->getOfficineId($request);
        $exerciceId = $request->filled('exercice_id') ? (int) $request->input('exercice_id') : null;

        return response()->json([
            'data' => $this->service->computeBalance($officineId, $exerciceId),
        ]);
    }

    public function exportBalanceCsv(Request $request): Response
    {
        $this->checkPermission($request, 'comptabilite.read');
        $officineId = $this->getOfficineId($request);
        $exerciceId = $request->filled('exercice_id') ? (int) $request->input('exercice_id') : null;

        $balance = $this->service->computeBalance($officineId, $exerciceId);
        $lines = ["code;compte;classe;nature;total_debit;total_credit;solde_debiteur;solde_crediteur"];
        foreach ($balance['rows'] as $row) {
            $lines[] = implode(';', [
                $row['code'],
                str_replace(';', ',', $row['label']),
                $row['classe'],
                $row['nature'],
                number_format((float) $row['total_debit'], 2, '.', ''),
                number_format((float) $row['total_credit'], 2, '.', ''),
                number_format((float) $row['solde_debiteur'], 2, '.', ''),
                number_format((float) $row['solde_crediteur'], 2, '.', ''),
            ]);
        }

        return response(implode("\n", $lines), 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="balance-syscohada.csv"',
        ]);
    }
}

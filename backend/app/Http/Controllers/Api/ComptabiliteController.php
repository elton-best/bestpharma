<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EcritureSyscohada;
use App\Models\FactureEmecef;
use App\Models\SessionCaisse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComptabiliteController extends Controller
{
    /**
     * Journal des ventes et écritures SYSCOHADA
     */
    public function journalVentes(Request $request): JsonResponse
    {
        $user = $request->user();
        $officineId = $user->officine_id;

        $query = EcritureSyscohada::where('officine_id', $officineId)
            ->with('vente')
            ->orderBy('date_piece', 'desc')
            ->orderBy('created_at', 'desc');

        if ($compte = $request->query('compte')) {
            $query->where('numero_compte', $compte);
        }

        $ecritures = $query->paginate(30);

        // Synthèse balance des comptes OHADA
        $balanceComptes = EcritureSyscohada::where('officine_id', $officineId)
            ->selectRaw('numero_compte, libelle_compte, SUM(debit) as total_debit, SUM(credit) as total_credit')
            ->groupBy('numero_compte', 'libelle_compte')
            ->orderBy('numero_compte')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $ecritures,
            'balance' => $balanceComptes,
        ]);
    }

    /**
     * Liste des factures normalisées DGI e-MECeF
     */
    public function facturesEmecef(Request $request): JsonResponse
    {
        $user = $request->user();
        $officineId = $user->officine_id;

        $factures = FactureEmecef::where('officine_id', $officineId)
            ->with(['vente.lignes.produit', 'vente.caissier'])
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json([
            'status' => 'success',
            'data' => $factures,
        ]);
    }

    /**
     * Historique des clôtures de caisse (Tickets Z)
     */
    public function cloturesCaisse(Request $request): JsonResponse
    {
        $user = $request->user();
        $officineId = $user->officine_id;

        $clotures = SessionCaisse::where('officine_id', $officineId)
            ->where('statut', 'fermee')
            ->with('caissier')
            ->orderBy('closed_at', 'desc')
            ->paginate(20);

        return response()->json([
            'status' => 'success',
            'data' => $clotures,
        ]);
    }

    /**
     * Saisie manuelle d'une écriture comptable (OD)
     */
    public function storeEcriture(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_piece' => 'required|date',
            'numero_piece' => 'required|string|max:50',
            'libelle_ecriture' => 'required|string|max:255',
            'journal_code' => 'nullable|string|max:20',
            'lignes' => 'required|array|min:2',
            'lignes.*.numero_compte' => 'required|string|max:20',
            'lignes.*.libelle_compte' => 'required|string|max:255',
            'lignes.*.debit' => 'nullable|numeric|min:0',
            'lignes.*.credit' => 'nullable|numeric|min:0',
        ]);

        $user = $request->user();
        $officineId = $user->officine_id ?: $user->officines()->first()?->id;

        $totalDebit = collect($validated['lignes'])->sum('debit');
        $totalCredit = collect($validated['lignes'])->sum('credit');

        if (abs($totalDebit - $totalCredit) > 0.01) {
            return response()->json([
                'message' => 'L\'écriture comptable doit être équilibrée : Total Débit (' . $totalDebit . ') ≠ Total Crédit (' . $totalCredit . ').',
            ], 422);
        }

        $journalCode = $validated['journal_code'] ?? 'OD';
        $creees = [];

        foreach ($validated['lignes'] as $ligne) {
            $creees[] = EcritureSyscohada::create([
                'officine_id' => $officineId,
                'date_piece' => $validated['date_piece'],
                'numero_piece' => $validated['numero_piece'],
                'numero_compte' => $ligne['numero_compte'],
                'libelle_compte' => $ligne['libelle_compte'],
                'libelle_ecriture' => $validated['libelle_ecriture'],
                'debit' => $ligne['debit'] ?? 0,
                'credit' => $ligne['credit'] ?? 0,
                'journal_code' => $journalCode,
            ]);
        }

        return response()->json([
            'message' => 'Écriture comptable enregistrée avec succès.',
            'data' => $creees,
        ], 201);
    }

    /**
     * Extourne d'une écriture comptable (CS-01)
     */
    public function extourneEcriture(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'motif' => 'required|string|max:255',
        ]);

        $originale = EcritureSyscohada::findOrFail($id);
        $user = $request->user();
        $officineId = $user->officine_id ?: $user->officines()->first()?->id;

        $extourne = EcritureSyscohada::create([
            'officine_id' => $officineId,
            'date_piece' => now()->toDateString(),
            'numero_piece' => 'EXT-' . $originale->numero_piece,
            'numero_compte' => $originale->numero_compte,
            'libelle_compte' => $originale->libelle_compte,
            'libelle_ecriture' => 'EXTOURNE : ' . $originale->libelle_ecriture . ' (Motif : ' . $validated['motif'] . ')',
            'debit' => $originale->credit,
            'credit' => $originale->debit,
            'journal_code' => $originale->journal_code,
        ]);

        return response()->json([
            'message' => 'Écriture extournée avec succès.',
            'data' => $extourne,
        ]);
    }
}

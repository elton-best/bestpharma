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
}

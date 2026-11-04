<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MouvementStock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MouvementStockController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $officineId = $request->user()->officine_id;
        $query = MouvementStock::where('officine_id', $officineId)
            ->with(['produit', 'lot', 'auteur', 'validateur'])
            ->orderBy('created_at', 'desc');

        if ($type = $request->query('type')) {
            $query->where('type_mouvement', $type);
        }
        if ($produitId = $request->query('produit_id')) {
            $query->where('produit_id', $produitId);
        }

        $mouvements = $query->paginate(30);

        return response()->json(['status' => 'success', 'data' => $mouvements]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'stock_lot_id' => 'required|uuid|exists:stocks_lots,id',
            'type_mouvement' => 'required|in:transfert_emplacement,casse,demarque,destruction,ajustement_inventaire,contre_passation',
            'quantite' => 'required|integer',
            'emplacement_cible' => 'nullable|string|max:100',
            'motif' => 'required|string|min:5|max:500',
            'reference_piece' => 'nullable|string|max:100',
        ]);

        $user = $request->user();
        $officineId = $user->officine_id;

        $lot = \App\Models\StockLot::where('officine_id', $officineId)->findOrFail($validated['stock_lot_id']);

        $stockAvant = $lot->quantite_disponible;
        // Cas transfert : pas de changement quantité, juste emplacement
        if ($validated['type_mouvement'] === 'transfert_emplacement') {
            $lot->update([
                'emplacement' => $validated['emplacement_cible'] ?? $lot->emplacement,
                'emplacement_id' => null,
                'dernier_modificateur_id' => $user->id,
                'date_changement_statut' => now(),
            ]);
            $stockApres = $stockAvant;
        } else {
            // Vérifier stock négatif (INT-01) sauf param autorisation
            $nouveau = $stockAvant + $validated['quantite'];
            if ($nouveau < 0) {
                return response()->json(['message' => 'Stock négatif refusé (RG-D02)'], 422);
            }
            $lot->update(['quantite_disponible' => $nouveau]);
            $stockApres = $nouveau;
        }

        $mouvement = MouvementStock::create([
            'officine_id' => $officineId,
            'stock_lot_id' => $lot->id,
            'produit_id' => $lot->produit_id,
            'type_mouvement' => $validated['type_mouvement'],
            'quantite' => $validated['quantite'],
            'stock_avant' => $stockAvant,
            'stock_apres' => $stockApres,
            'emplacement_source' => $lot->emplacement,
            'emplacement_cible' => $validated['emplacement_cible'] ?? null,
            'reference_piece' => $validated['reference_piece'] ?? null,
            'auteur_id' => $user->id,
            'motif' => $validated['motif'],
        ]);

        return response()->json(['status' => 'success', 'message' => 'Mouvement enregistré', 'data' => $mouvement->load(['produit','lot'])], 201);
    }
}

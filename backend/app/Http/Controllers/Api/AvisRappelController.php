<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AvisRappel;
use App\Models\StockLot;
use App\Models\MouvementStock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AvisRappelController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $officineId = $request->user()->officine_id;
        $avis = AvisRappel::where('officine_id', $officineId)->orderBy('date_avis', 'desc')->paginate(20);
        return response()->json(['status' => 'success', 'data' => $avis]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source' => 'required|string|max:150',
            'produits_concernes' => 'required|string',
            'lots_concernes' => 'nullable|array',
            'lots_concernes.*.produit_id' => 'nullable|uuid',
            'lots_concernes.*.numero_lot' => 'nullable|string',
            'date_avis' => 'required|date',
            'action_requise' => 'required|string',
        ]);

        $user = $request->user();
        $officineId = $user->officine_id;
        $count = AvisRappel::where('officine_id', $officineId)->count() + 1;
        $ref = sprintf('RAPPEL-%s-%04d', Carbon::now()->format('Y'), $count);

        $avis = AvisRappel::create([
            'officine_id' => $officineId,
            'reference' => $ref,
            'source' => $validated['source'],
            'produits_concernes' => $validated['produits_concernes'],
            'lots_concernes' => $validated['lots_concernes'] ?? [],
            'date_avis' => $validated['date_avis'],
            'action_requise' => $validated['action_requise'],
            'statut' => 'actif',
            'auteur_id' => $user->id,
        ]);

        // Blocage immédiat des lots concernés (STO-14)
        if (!empty($validated['lots_concernes'])) {
            foreach ($validated['lots_concernes'] as $lc) {
                if (!empty($lc['numero_lot'])) {
                    $lots = StockLot::where('officine_id', $officineId)->where('numero_lot', $lc['numero_lot'])->get();
                    foreach ($lots as $lot) {
                        $lot->update([
                            'statut_detail' => 'quarantaine',
                            'motif_statut' => 'Rappel lot '.$ref.' — '.$validated['source'],
                            'dernier_modificateur_id' => $user->id,
                            'date_changement_statut' => now(),
                        ]);
                        MouvementStock::create([
                            'officine_id' => $officineId,
                            'stock_lot_id' => $lot->id,
                            'produit_id' => $lot->produit_id,
                            'type_mouvement' => 'changement_statut',
                            'quantite' => 0,
                            'stock_avant' => $lot->quantite_disponible,
                            'stock_apres' => $lot->quantite_disponible,
                            'reference_piece' => $ref,
                            'auteur_id' => $user->id,
                            'motif' => 'Blocage automatique rappel lot',
                        ]);
                    }
                }
            }
        }

        return response()->json(['status' => 'success', 'message' => 'Avis de rappel enregistré et lots bloqués', 'data' => $avis], 201);
    }

    public function cloturer(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate(['preuve_cloture' => 'required|string']);
        $user = $request->user();
        $officineId = $user->officine_id;
        $avis = AvisRappel::where('officine_id', $officineId)->findOrFail($id);
        $avis->update(['statut' => 'cloture', 'cloture_par_id' => $user->id, 'date_cloture' => now(), 'preuve_cloture' => $validated['preuve_cloture']]);
        return response()->json(['status' => 'success', 'message' => 'Rappel clôturé', 'data' => $avis]);
    }
}

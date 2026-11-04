<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LotDechet;
use App\Models\MouvementStock;
use App\Models\StockLot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DechetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $officineId = $request->user()->officine_id;
        $dechets = LotDechet::where('officine_id', $officineId)->orderBy('created_at', 'desc')->paginate(20);
        return response()->json(['status' => 'success', 'data' => $dechets]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'motif' => 'required|in:perime,avarie,non_conforme,rappele,retour_client,autre',
            'lots_ids' => 'required|array|min:1',
            'lots_ids.*' => 'uuid|exists:stocks_lots,id',
            'prestataire_nom' => 'nullable|string|max:200',
            'date_destruction_prevue' => 'nullable|date',
        ]);

        $user = $request->user();
        $officineId = $user->officine_id;

        $lots = StockLot::where('officine_id', $officineId)->whereIn('id', $validated['lots_ids'])->get();
        if ($lots->isEmpty()) {
            return response()->json(['message' => 'Aucun lot trouvé'], 404);
        }

        $quantite = $lots->sum('quantite_disponible');
        $valeur = $lots->sum(fn($l) => $l->quantite_disponible * (float)($l->prix_achat_unitaire ?? 0));

        $count = LotDechet::where('officine_id', $officineId)->count() + 1;
        $ref = sprintf('DECHET-%s-%04d', Carbon::now()->format('Y'), $count);

        $dechet = LotDechet::create([
            'officine_id' => $officineId,
            'reference' => $ref,
            'motif' => $validated['motif'],
            'lots_originels' => $lots->map(fn($l) => ['id'=>$l->id,'numero_lot'=>$l->numero_lot,'quantite'=>$l->quantite_disponible])->toArray(),
            'quantite_totale' => $quantite,
            'valeur_perte' => $valeur,
            'prestataire_nom' => $validated['prestataire_nom'] ?? null,
            'date_destruction_prevue' => $validated['date_destruction_prevue'] ?? null,
            'constitue_par_id' => $user->id,
        ]);

        // Passage des lots en dechet (STO-17)
        foreach ($lots as $lot) {
            $stockAvant = $lot->quantite_disponible;
            $lot->update([
                'statut_detail' => 'dechet',
                'statut' => 'retire',
                'motif_statut' => 'Déchet '.$ref.' — '.$validated['motif'],
                'quantite_disponible' => 0,
                'dernier_modificateur_id' => $user->id,
                'date_changement_statut' => now(),
            ]);
            MouvementStock::create([
                'officine_id' => $officineId,
                'stock_lot_id' => $lot->id,
                'produit_id' => $lot->produit_id,
                'type_mouvement' => 'destruction',
                'quantite' => -$stockAvant,
                'stock_avant' => $stockAvant,
                'stock_apres' => 0,
                'reference_piece' => $ref,
                'auteur_id' => $user->id,
                'motif' => 'Sortie vers déchet — '.$validated['motif'],
            ]);
        }

        return response()->json(['status' => 'success', 'message' => 'Lot de déchets constitué — perte comptable générée', 'data' => $dechet], 201);
    }

    public function detruire(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!in_array($user->role, ['pharmacien_titulaire','pharmacien_adjoint','promoteur'])) {
            return response()->json(['message' => 'Seul un pharmacien peut valider une destruction (BPD9)'], 403);
        }
        $officineId = $user->officine_id;
        $dechet = LotDechet::where('officine_id', $officineId)->findOrFail($id);
        $dechet->update([
            'statut' => 'detruit',
            'date_destruction_reelle' => now()->toDateString(),
            'detruit_par_id' => $user->id,
        ]);
        return response()->json(['status' => 'success', 'message' => 'Destruction validée — PV à archiver 10 ans', 'data' => $dechet]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventaire;
use App\Models\LigneInventaire;
use App\Models\MouvementStock;
use App\Models\StockLot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class InventaireController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $officineId = $request->user()->officine_id;
        $inventaires = Inventaire::where('officine_id', $officineId)
            ->withCount('lignes')
            ->orderBy('created_at', 'desc')
            ->paginate(20);
        return response()->json(['status' => 'success', 'data' => $inventaires]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:tournant,general_annuel',
            'zone' => 'nullable|string|max:100',
            'date_inventaire' => 'required|date',
            'double_comptage' => 'boolean',
            'comptage_aveugle' => 'boolean',
        ]);

        $user = $request->user();
        $officineId = $user->officine_id;
        $annee = Carbon::now()->format('Y');
        $count = Inventaire::where('officine_id', $officineId)->whereYear('created_at', $annee)->count() + 1;
        $ref = sprintf('INV-%s-%04d', $annee, $count);

        $inv = Inventaire::create([
            'officine_id' => $officineId,
            'reference' => $ref,
            'type' => $validated['type'],
            'zone' => $validated['zone'] ?? null,
            'statut' => 'en_cours',
            'date_inventaire' => $validated['date_inventaire'],
            'initiateur_id' => $user->id,
            'Parametres' => [
                'double_comptage' => $validated['double_comptage'] ?? false,
                'comptage_aveugle' => $validated['comptage_aveugle'] ?? false,
            ],
        ]);

        // Génération des lignes théoriques depuis stocks
        $lotsQuery = StockLot::where('officine_id', $officineId)->where('quantite_disponible', '>', 0);
        if ($validated['zone']) {
            $lotsQuery->where('emplacement', $validated['zone']);
        }
        $lots = $lotsQuery->with('produit')->get();
        foreach ($lots as $lot) {
            LigneInventaire::create([
                'inventaire_id' => $inv->id,
                'produit_id' => $lot->produit_id,
                'stock_lot_id' => $lot->id,
                'quantite_theorique' => $lot->quantite_disponible,
            ]);
        }

        return response()->json(['status' => 'success', 'message' => 'Inventaire créé', 'data' => $inv->load('lignes')], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $officineId = $request->user()->officine_id;
        $inv = Inventaire::where('officine_id', $officineId)->with(['lignes.produit','lignes.lot','initiateur','validateur'])->findOrFail($id);
        return response()->json(['status' => 'success', 'data' => $inv]);
    }

    public function compter(Request $request, string $inventaireId, string $ligneId): JsonResponse
    {
        $validated = $request->validate([
            'quantite_comptee' => 'required|integer|min:0',
            'commentaire' => 'nullable|string|max:500',
        ]);
        $user = $request->user();
        $officineId = $user->officine_id;
        $inv = Inventaire::where('officine_id', $officineId)->findOrFail($inventaireId);
        if (!in_array($inv->statut, ['en_cours','brouillon'])) {
            return response()->json(['message' => 'Inventaire non modifiable à ce stade'], 422);
        }
        $ligne = LigneInventaire::where('inventaire_id', $inv->id)->findOrFail($ligneId);
        $ecart = $validated['quantite_comptee'] - $ligne->quantite_theorique;
        $valorisation = null;
        if ($ligne->lot) {
            $lot = StockLot::find($ligne->stock_lot_id);
            $valorisation = $ecart * (float)($lot->prix_achat_unitaire ?? 0);
        }
        $ligne->update([
            'quantite_comptee' => $validated['quantite_comptee'],
            'ecart' => $ecart,
            'valorisation_ecart' => $valorisation,
            'commentaire' => $validated['commentaire'] ?? $ligne->commentaire,
            'compteur_id' => $user->id,
        ]);

        return response()->json(['status' => 'success', 'data' => $ligne]);
    }

    public function valider(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!in_array($user->role, ['pharmacien_titulaire','pharmacien_adjoint','promoteur','rmq'])) {
            return response()->json(['message' => 'Seul le pharmacien/RMQ peut valider un inventaire (STO-12)'], 403);
        }
        $officineId = $user->officine_id;
        $inv = Inventaire::where('officine_id', $officineId)->findOrFail($id);
        if ($inv->lignes()->whereNull('quantite_comptee')->exists()) {
            return response()->json(['message' => 'Toutes les lignes doivent être comptées avant validation'], 422);
        }

        return DB::transaction(function () use ($inv, $user) {
            foreach ($inv->lignes as $ligne) {
                if ($ligne->ecart !== 0 && $ligne->stock_lot_id) {
                    $lot = StockLot::find($ligne->stock_lot_id);
                    $stockAvant = $lot->quantite_disponible;
                    $lot->update(['quantite_disponible' => $ligne->quantite_comptee]);

                    MouvementStock::create([
                        'officine_id' => $inv->officine_id,
                        'stock_lot_id' => $lot->id,
                        'produit_id' => $lot->produit_id,
                        'type_mouvement' => 'ajustement_inventaire',
                        'quantite' => $ligne->ecart,
                        'stock_avant' => $stockAvant,
                        'stock_apres' => $ligne->quantite_comptee,
                        'reference_piece' => $inv->reference,
                        'auteur_id' => $user->id,
                        'validateur_id' => $user->id,
                        'motif' => 'Ajustement inventaire '.$inv->reference.' — écart '.$ligne->ecart,
                    ]);
                }
            }
            $inv->update(['statut' => 'valide', 'validateur_id' => $user->id, 'date_validation' => now()]);
            return response()->json(['status' => 'success', 'message' => 'Inventaire validé et ajustements appliqués', 'data' => $inv]);
        });
    }
}

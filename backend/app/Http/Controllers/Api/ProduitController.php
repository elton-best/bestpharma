<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Produit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProduitController extends Controller
{
    /**
     * Liste des produits avec recherche multi-critères
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $officineId = $user->officine_id;

        $query = Produit::query()
            ->where(function ($q) use ($officineId) {
                $q->whereNull('officine_id')->orWhere('officine_id', $officineId);
            });

        // Recherche par mot clé (nom, DCI, CIP)
        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('nom_commercial', 'ilike', "%{$search}%")
                  ->orWhere('dci', 'ilike', "%{$search}%")
                  ->orWhere('code_cip', 'ilike', "%{$search}%");
            });
        }

        // Filtre par tableau vénéneux
        if ($tableau = $request->query('tableau')) {
            $query->where('tableau_substance', $tableau);
        }

        // Filtre thermolabile
        if ($request->has('thermolabile')) {
            $query->where('est_thermolabile', filter_var($request->query('thermolabile'), FILTER_VALIDATE_BOOLEAN));
        }

        $produits = $query->with(['lots' => function ($q) use ($officineId) {
            $q->where('officine_id', $officineId)
              ->vendables()
              ->orderBy('date_peremption', 'asc');
        }])->orderBy('nom_commercial', 'asc')->get();

        // Calcul du stock total et du lot FEFO prioritaire pour chaque produit
        $resultats = $produits->map(function ($p) {
            $stockTotal = $p->lots->sum('quantite_disponible');
            $prochainLotFefo = $p->lots->first();

            return [
                'id' => $p->id,
                'code_cip' => $p->code_cip,
                'nom_commercial' => $p->nom_commercial,
                'dci' => $p->dci,
                'forme' => $p->forme,
                'dosage' => $p->dosage,
                'classe_therapeutique' => $p->classe_therapeutique,
                'tableau_substance' => $p->tableau_substance,
                'est_thermolabile' => $p->est_thermolabile,
                'necessite_ordonnance' => $p->necessite_ordonnance,
                'prix_public_ttc' => (float) $p->prix_public_ttc,
                'stock_total' => $stockTotal,
                'seuil_stock_min' => $p->seuil_stock_min,
                'alerte_rupture' => $stockTotal <= $p->seuil_stock_min,
                'prochain_lot_fefo' => $prochainLotFefo ? [
                    'id' => $prochainLotFefo->id,
                    'numero_lot' => $prochainLotFefo->numero_lot,
                    'date_peremption' => $prochainLotFefo->date_peremption->format('Y-m-d'),
                    'quantite_disponible' => $prochainLotFefo->quantite_disponible,
                    'jours_avant_peremption' => $prochainLotFefo->jours_avant_peremption,
                    'statut_peremption' => $prochainLotFefo->statut_peremption,
                ] : null,
                'lots' => $p->lots,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $request->boolean('vendables') ? $resultats->filter(fn ($p) => $p['stock_total'] > 0)->values() : $resultats,
        ]);
    }

    /**
     * Création d'un nouveau produit au catalogue
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code_cip' => 'required|string|max:30|unique:produits,code_cip',
            'nom_commercial' => 'required|string|max:255',
            'dci' => 'nullable|string|max:255',
            'forme' => 'nullable|string|max:100',
            'dosage' => 'nullable|string|max:100',
            'classe_therapeutique' => 'nullable|string|max:150',
            'tableau_substance' => 'required|in:sans,liste_1,liste_2,stupefiant',
            'est_thermolabile' => 'boolean',
            'necessite_ordonnance' => 'boolean',
            'prix_achat_ht' => 'nullable|numeric|min:0',
            'prix_public_ttc' => 'required|numeric|min:0',
            'seuil_stock_min' => 'nullable|integer|min:0',
            'seuil_stock_securite' => 'nullable|integer|min:0',
        ]);

        $user = $request->user();
        $validated['officine_id'] = $user->officine_id;

        $produit = Produit::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Produit ajouté avec succès au catalogue',
            'data' => $produit,
        ], 201);
    }
}

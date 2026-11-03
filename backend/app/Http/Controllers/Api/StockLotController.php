<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Produit;
use App\Models\RegistreStupefiant;
use App\Models\StockLot;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockLotController extends Controller
{
    /**
     * Liste des lots en stock avec filtres FEFO, alertes péremption et recherche
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $officineId = $user->officine_id;

        $query = StockLot::query()
            ->with('produit')
            ->where('officine_id', $officineId);

        // Filtre par statut (en_stock, quarantaine, epuise, etc.)
        if ($statut = $request->query('statut')) {
            $query->where('statut', $statut);
        } else {
            // Par défaut, afficher les lots actifs (en_stock et quarantaine)
            $query->whereIn('statut', ['en_stock', 'quarantaine']);
        }

        // Filtre par niveau d'alerte de péremption (BPD Art. 5.12)
        if ($alerte = $request->query('alerte')) {
            $today = Carbon::now()->startOfDay();
            if ($alerte === 'perime') {
                $query->where('date_peremption', '<', $today);
            } elseif ($alerte === 'critique_1m') {
                $query->whereBetween('date_peremption', [$today, $today->copy()->addDays(30)]);
            } elseif ($alerte === 'alerte_3m') {
                $query->whereBetween('date_peremption', [$today, $today->copy()->addDays(90)]);
            } elseif ($alerte === 'attention_6m') {
                $query->whereBetween('date_peremption', [$today, $today->copy()->addDays(180)]);
            }
        }

        // Recherche par produit ou numéro de lot
        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('numero_lot', 'ilike', "%{$search}%")
                  ->orWhereHas('produit', function ($pq) use ($search) {
                      $pq->where('nom_commercial', 'ilike', "%{$search}%")
                         ->orWhere('dci', 'ilike', "%{$search}%")
                         ->orWhere('code_cip', 'ilike', "%{$search}%");
                  });
            });
        }

        // Tri FEFO strict (Art. BPD5-F08)
        $lots = $query->orderBy('date_peremption', 'asc')->get();

        // Statistiques globales de péremption pour le tableau de bord
        $statsPeremption = [
            'perimes' => StockLot::where('officine_id', $officineId)
                ->where('quantite_disponible', '>', 0)
                ->where('date_peremption', '<', Carbon::now())
                ->count(),
            'critiques_1m' => StockLot::where('officine_id', $officineId)
                ->where('quantite_disponible', '>', 0)
                ->whereBetween('date_peremption', [Carbon::now(), Carbon::now()->addDays(30)])
                ->count(),
            'alertes_3m' => StockLot::where('officine_id', $officineId)
                ->where('quantite_disponible', '>', 0)
                ->whereBetween('date_peremption', [Carbon::now(), Carbon::now()->addDays(90)])
                ->count(),
            'total_lots_actifs' => StockLot::where('officine_id', $officineId)
                ->where('quantite_disponible', '>', 0)
                ->where('statut', 'en_stock')
                ->count(),
        ];

        return response()->json([
            'status' => 'success',
            'data' => $lots,
            'stats' => $statsPeremption,
        ]);
    }

    /**
     * Réception de commande grossiste / Entrée de stock par lot
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'produit_id' => 'required|uuid|exists:produits,id',
            'numero_lot' => 'required|string|max:100',
            'date_fabrication' => 'nullable|date',
            'date_peremption' => 'required|date|after:today',
            'quantite' => 'required|integer|min:1',
            'emplacement' => 'nullable|string|max:100',
            'prix_achat_unitaire' => 'nullable|numeric|min:0',
            'fournisseur_nom' => 'required|string|max:200', // CAMEG, UBIPHARM, etc.
            'bon_livraison_ref' => 'required|string|max:100',
        ]);

        $user = $request->user();
        $officineId = $user->officine_id;

        return DB::transaction(function () use ($validated, $user, $officineId) {
            $produit = Produit::findOrFail($validated['produit_id']);

            // Création ou mise à jour du lot
            $lot = StockLot::create([
                'officine_id' => $officineId,
                'produit_id' => $produit->id,
                'numero_lot' => $validated['numero_lot'],
                'date_fabrication' => $validated['date_fabrication'] ?? null,
                'date_peremption' => $validated['date_peremption'],
                'quantite_initiale' => $validated['quantite'],
                'quantite_disponible' => $validated['quantite'],
                'emplacement' => $validated['emplacement'] ?? ($produit->est_thermolabile ? 'Réfrigérateur 2°C-8°C' : 'Rayonnage Principal'),
                'prix_achat_unitaire' => $validated['prix_achat_unitaire'] ?? $produit->prix_achat_ht,
                'fournisseur_nom' => $validated['fournisseur_nom'],
                'bon_livraison_ref' => $validated['bon_livraison_ref'],
                'statut' => 'en_stock',
            ]);

            // Si c'est un stupéfiant, enregistrement obligatoire dans le registre officiel (Art. 7.15 BPD)
            if ($produit->tableau_substance === 'stupefiant') {
                $dernierNumOrdre = RegistreStupefiant::where('officine_id', $officineId)->max('numero_ordre') ?? 0;
                $stockPrecedent = StockLot::where('officine_id', $officineId)
                    ->where('produit_id', $produit->id)
                    ->where('id', '!=', $lot->id)
                    ->sum('quantite_disponible');

                RegistreStupefiant::create([
                    'officine_id' => $officineId,
                    'numero_ordre' => $dernierNumOrdre + 1,
                    'date_mouvement' => Carbon::now(),
                    'type_mouvement' => 'entree_livraison',
                    'produit_id' => $produit->id,
                    'stock_lot_id' => $lot->id,
                    'quantite' => $validated['quantite'],
                    'stock_precedent' => $stockPrecedent,
                    'stock_nouveau' => $stockPrecedent + $validated['quantite'],
                    'reference_piece' => 'BL ' . $validated['bon_livraison_ref'],
                    'tiers_nom' => $validated['fournisseur_nom'],
                    'operateur_id' => $user->id,
                    'observations' => "Entrée de stock lot {$lot->numero_lot} (FEFO)",
                ]);
            }

            return response()->json([
                'status' => 'success',
                'message' => "Lot {$lot->numero_lot} réceptionné et enregistré selon la règle FEFO",
                'data' => $lot->load('produit'),
            ], 201);
        });
    }

    /**
     * Mise en quarantaine immédiate d'un lot (rappel de lot fabricant ou non-conformité BPD Art. 5.14)
     */
    public function miseEnQuarantaine(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'motif' => 'required|string|min:5|max:500',
        ]);

        $user = $request->user();
        $lot = StockLot::where('officine_id', $user->officine_id)->findOrFail($id);

        $lot->update([
            'statut' => 'quarantaine',
            'motif_quarantaine' => $validated['motif'],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Le lot {$lot->numero_lot} a été placé en quarantaine avec succès",
            'data' => $lot,
        ]);
    }

    /**
     * Levée de quarantaine ou réintégration
     */
    public function leverQuarantaine(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $lot = StockLot::where('officine_id', $user->officine_id)->findOrFail($id);

        $lot->update([
            'statut' => 'en_stock',
            'motif_quarantaine' => null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Le lot {$lot->numero_lot} a été réintégré en stock disponible",
            'data' => $lot,
        ]);
    }
}

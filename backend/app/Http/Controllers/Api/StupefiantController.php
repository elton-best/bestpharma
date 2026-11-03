<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Produit;
use App\Models\RegistreStupefiant;
use App\Models\StockLot;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StupefiantController extends Controller
{
    /**
     * Registre officiel inaltérable des stupéfiants avec balance en temps réel
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $officineId = $user->officine_id;

        $query = RegistreStupefiant::where('officine_id', $officineId)
            ->with(['produit', 'lot', 'operateur', 'pharmacienVisa'])
            ->orderBy('numero_ordre', 'desc');

        if ($produitId = $request->query('produit_id')) {
            $query->where('produit_id', $produitId);
        }

        $mouvements = $query->paginate(30);

        // Balance instantanée par produit stupéfiant
        $produitsStupefiants = Produit::where(function ($q) use ($officineId) {
                $q->whereNull('officine_id')->orWhere('officine_id', $officineId);
            })
            ->where('tableau_substance', 'stupefiant')
            ->with(['lots' => function ($q) use ($officineId) {
                $q->where('officine_id', $officineId)
                  ->where('statut', 'en_stock');
            }])
            ->get()
            ->map(function ($p) use ($officineId) {
                $stockPhysique = $p->lots->sum('quantite_disponible');
                $dernierMouvement = RegistreStupefiant::where('officine_id', $officineId)
                    ->where('produit_id', $p->id)
                    ->orderBy('numero_ordre', 'desc')
                    ->first();

                return [
                    'id' => $p->id,
                    'code_cip' => $p->code_cip,
                    'nom_commercial' => $p->nom_commercial,
                    'dosage' => $p->dosage,
                    'stock_theorique_registre' => $dernierMouvement ? $dernierMouvement->stock_nouveau : 0,
                    'stock_physique_lots' => $stockPhysique,
                    'concordance_exacte' => $dernierMouvement ? ($dernierMouvement->stock_nouveau === $stockPhysique) : ($stockPhysique === 0),
                    'non_vises_count' => RegistreStupefiant::where('officine_id', $officineId)
                        ->where('produit_id', $p->id)
                        ->whereNull('pharmacien_visa_id')
                        ->count(),
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $mouvements,
            'balance_produits' => $produitsStupefiants,
        ]);
    }

    /**
     * Visa officiel du pharmacien titulaire sur une ligne de mouvement de stupéfiant
     */
    public function viser(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!in_array($user->role, ['pharmacien_titulaire', 'pharmacien_adjoint', 'promoteur'])) {
            return response()->json(['message' => 'Seul un pharmacien peut apposer son visa sur le registre des stupéfiants.'], 403);
        }

        $mouvement = RegistreStupefiant::where('officine_id', $user->officine_id)->findOrFail($id);

        $mouvement->update([
            'pharmacien_visa_id' => $user->id,
            'date_visa' => Carbon::now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Ligne de registre visée par le pharmacien',
            'data' => $mouvement->load('pharmacienVisa'),
        ]);
    }
}

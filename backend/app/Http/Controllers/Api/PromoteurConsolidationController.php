<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CampagneAutoEvaluation;
use App\Models\LigneTransfertInterOfficine;
use App\Models\NonConformite;
use App\Models\Officine;
use App\Models\Produit;
use App\Models\StockLot;
use App\Models\TransfertInterOfficine;
use App\Models\VenteCaisse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PromoteurConsolidationController extends Controller
{
    /**
     * Tableau de bord de consolidation multi-officines du promoteur
     */
    public function consolidation(Request $request): JsonResponse
    {
        $user = $request->user();

        // Récupérer toutes les officines accessibles à l'utilisateur
        $officines = $user->officines()
            ->where('officines.archived', false)
            ->wherePivot('actif', true)
            ->get();

        if ($officines->isEmpty()) {
            return response()->json([
                'officines' => [],
                'totaux_groupe' => [
                    'nombre_officines' => 0,
                    'ca_jour_total' => 0,
                    'ca_mois_total' => 0,
                    'valeur_stock_totale' => 0,
                    'alertes_peremption_totales' => 0,
                    'non_conformites_ouvertes' => 0,
                ],
                'opportunites_transferts' => [],
                'transferts_recents' => [],
            ]);
        }

        $today = now()->toDateString();
        $debutMois = now()->startOfMonth()->toDateTimeString();

        $officinesData = [];
        $totauxGroupe = [
            'nombre_officines' => $officines->count(),
            'ca_jour_total' => 0,
            'ca_mois_total' => 0,
            'valeur_stock_totale' => 0,
            'alertes_peremption_totales' => 0,
            'non_conformites_ouvertes' => 0,
        ];

        foreach ($officines as $officine) {
            $id = $officine->id;

            // 1. Chiffre d'affaires
            $caJour = (float) VenteCaisse::where('officine_id', $id)
                ->whereDate('created_at', $today)
                ->sum('montant_net_ttc');

            $caMois = (float) VenteCaisse::where('officine_id', $id)
                ->where('created_at', '>=', $debutMois)
                ->sum('montant_net_ttc');

            $nbVentesJour = VenteCaisse::where('officine_id', $id)
                ->whereDate('created_at', $today)
                ->count();

            // 2. Stocks et valorisation
            $lotsEnStock = StockLot::where('officine_id', $id)
                ->where('quantite_disponible', '>', 0)
                ->where('statut', 'en_stock')
                ->get();

            $valeurStock = 0;
            $nbPeremptionsCritiques = 0;
            $dateLimite30j = now()->addDays(30)->toDateString();
            $dateLimite90j = now()->addDays(90)->toDateString();
            $nbPeremptions90j = 0;

            foreach ($lotsEnStock as $lot) {
                $valeurStock += ((float) $lot->quantite_disponible) * ((float) ($lot->prix_achat_unitaire ?: 1000));
                if ($lot->date_peremption <= $dateLimite30j) {
                    $nbPeremptionsCritiques++;
                } elseif ($lot->date_peremption <= $dateLimite90j) {
                    $nbPeremptions90j++;
                }
            }

            $nbReferences = $lotsEnStock->pluck('produit_id')->unique()->count();

            // 3. Qualité BPD & Pointage
            $derniereCampagne = CampagneAutoEvaluation::where('officine_id', $id)
                ->latest()
                ->first();

            $scoreBpd = $derniereCampagne && isset($derniereCampagne->score_global)
                ? (float) $derniereCampagne->score_global
                : 95.0;

            $ncOuvertes = NonConformite::where('officine_id', $id)
                ->where('statut', '!=', 'cloturee')
                ->count();

            // Présence pharmacien en direct (pointages aujourd'hui)
            $pharmacienSurPlace = $this->verifierPresencePharmacien($id);

            // Accumulation totaux groupe
            $totauxGroupe['ca_jour_total'] += $caJour;
            $totauxGroupe['ca_mois_total'] += $caMois;
            $totauxGroupe['valeur_stock_totale'] += $valeurStock;
            $totauxGroupe['alertes_peremption_totales'] += $nbPeremptionsCritiques;
            $totauxGroupe['non_conformites_ouvertes'] += $ncOuvertes;

            $officinesData[] = [
                'id' => $id,
                'nom' => $officine->nom,
                'ville' => $officine->ville,
                'numero_licence' => $officine->numero_licence,
                'ca_jour' => $caJour,
                'ca_mois' => $caMois,
                'nb_ventes_jour' => $nbVentesJour,
                'valeur_stock' => $valeurStock,
                'nb_references' => $nbReferences,
                'alertes_peremption_30j' => $nbPeremptionsCritiques,
                'alertes_peremption_90j' => $nbPeremptions90j,
                'score_bpd' => $scoreBpd,
                'non_conformites_ouvertes' => $ncOuvertes,
                'pharmacien_present' => $pharmacienSurPlace['present'],
                'pharmaciens_noms' => $pharmacienSurPlace['pharmaciens'],
            ];
        }

        // 4. Détection intelligente des opportunités de transferts inter-officines
        $opportunites = $this->detecterOpportunitesTransferts($officines->pluck('id')->all());

        // 5. Transferts récents
        $transfertsRecents = TransfertInterOfficine::with([
            'officineSource:id,nom,ville',
            'officineDestinataire:id,nom,ville',
            'demandeur:id,name',
            'lignes.produit:id,nom_commercial,dosage,forme,code_cip',
        ])
            ->where(function ($q) use ($officines) {
                $ids = $officines->pluck('id')->all();
                $q->whereIn('officine_source_id', $ids)
                  ->orWhereIn('officine_destinataire_id', $ids);
            })
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'officines' => $officinesData,
            'totaux_groupe' => $totauxGroupe,
            'opportunites_transferts' => $opportunites,
            'transferts_recents' => $transfertsRecents,
        ]);
    }

    /**
     * Liste des transferts inter-officines
     */
    public function transferts(Request $request): JsonResponse
    {
        $officineIds = $request->user()->officines()->pluck('officines.id')->all();

        $transferts = TransfertInterOfficine::with([
            'officineSource:id,nom,ville',
            'officineDestinataire:id,nom,ville',
            'demandeur:id,name',
            'validateur:id,name',
            'lignes.produit:id,nom_commercial,dosage,forme,code_cip',
        ])
            ->where(function ($q) use ($officineIds) {
                $q->whereIn('officine_source_id', $officineIds)
                  ->orWhereIn('officine_destinataire_id', $officineIds);
            })
            ->latest()
            ->get();

        return response()->json($transferts);
    }

    /**
     * Création d'un transfert inter-officines
     */
    public function storeTransfert(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'officine_source_id' => 'required|uuid|exists:officines,id',
            'officine_destinataire_id' => 'required|uuid|exists:officines,id|different:officine_source_id',
            'motif' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'lignes' => 'required|array|min:1',
            'lignes.*.produit_id' => 'required|uuid|exists:produits,id',
            'lignes.*.stock_lot_source_id' => 'nullable|uuid|exists:stocks_lots,id',
            'lignes.*.numero_lot' => 'required|string',
            'lignes.*.date_peremption' => 'required|date',
            'lignes.*.quantite' => 'required|integer|min:1',
            'lignes.*.prix_unitaire_achat' => 'nullable|numeric|min:0',
        ]);

        $numero = 'TRF-' . date('Y') . '-' . strtoupper(Str::random(6));

        DB::beginTransaction();
        try {
            $transfert = TransfertInterOfficine::create([
                'id' => (string) Str::uuid(),
                'numero_transfert' => $numero,
                'officine_source_id' => $validated['officine_source_id'],
                'officine_destinataire_id' => $validated['officine_destinataire_id'],
                'statut' => 'valide', // validé dès la création par le promoteur
                'motif' => $validated['motif'] ?? 'Rééquilibrage de stock groupe',
                'notes' => $validated['notes'] ?? null,
                'demandeur_id' => $request->user()->id,
                'valide_par_id' => $request->user()->id,
                'expedie_a' => now(),
            ]);

            foreach ($validated['lignes'] as $ligne) {
                LigneTransfertInterOfficine::create([
                    'id' => (string) Str::uuid(),
                    'transfert_id' => $transfert->id,
                    'produit_id' => $ligne['produit_id'],
                    'stock_lot_source_id' => $ligne['stock_lot_source_id'] ?? null,
                    'numero_lot' => $ligne['numero_lot'],
                    'date_peremption' => $ligne['date_peremption'],
                    'quantite' => $ligne['quantite'],
                    'prix_unitaire_achat' => $ligne['prix_unitaire_achat'] ?? 0,
                ]);

                // Décrémenter la quantité dans le lot source si fourni
                if (!empty($ligne['stock_lot_source_id'])) {
                    $lotSource = StockLot::find($ligne['stock_lot_source_id']);
                    if ($lotSource) {
                        $nouvelleQte = max(0, $lotSource->quantite_disponible - $ligne['quantite']);
                        $lotSource->update(['quantite_disponible' => $nouvelleQte]);
                    }
                }
            }

            DB::commit();

            $transfert->load(['officineSource', 'officineDestinataire', 'lignes.produit']);

            return response()->json([
                'message' => 'Transfert inter-officines initié avec succès.',
                'transfert' => $transfert,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erreur lors de la création du transfert : ' . $e->getMessage()], 500);
        }
    }

    /**
     * Réception d'un transfert dans l'officine destinataire
     */
    public function receptionnerTransfert(Request $request, string $id): JsonResponse
    {
        $transfert = TransfertInterOfficine::with('lignes')->findOrFail($id);

        if ($transfert->statut === 'receptionne') {
            return response()->json(['message' => 'Ce transfert est déjà réceptionné.'], 400);
        }

        DB::beginTransaction();
        try {
            $transfert->update([
                'statut' => 'receptionne',
                'receptionne_a' => now(),
            ]);

            // Pour chaque ligne, créditer ou créer un lot dans l'officine destinataire
            foreach ($transfert->lignes as $ligne) {
                $lotDest = StockLot::where('officine_id', $transfert->officine_destinataire_id)
                    ->where('produit_id', $ligne->produit_id)
                    ->where('numero_lot', $ligne->numero_lot)
                    ->first();

                if ($lotDest) {
                    $lotDest->update([
                        'quantite_disponible' => $lotDest->quantite_disponible + $ligne->quantite,
                        'quantite_initiale' => $lotDest->quantite_initiale + $ligne->quantite,
                        'statut' => 'en_stock',
                    ]);
                } else {
                    StockLot::create([
                        'id' => (string) Str::uuid(),
                        'officine_id' => $transfert->officine_destinataire_id,
                        'produit_id' => $ligne->produit_id,
                        'numero_lot' => $ligne->numero_lot,
                        'date_peremption' => $ligne->date_peremption,
                        'date_reception' => now()->toDateString(),
                        'quantite_initiale' => $ligne->quantite,
                        'quantite_disponible' => $ligne->quantite,
                        'prix_achat_unitaire' => $ligne->prix_unitaire_achat,
                        'fournisseur_nom' => $transfert->officineSource->nom ?? 'Transfert inter-officines',
                        'statut' => 'en_stock',
                        'bon_livraison_ref' => $transfert->numero_transfert,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Transfert réceptionné et stock destinataire mis à jour avec succès.',
                'transfert' => $transfert->fresh(['officineSource', 'officineDestinataire', 'lignes.produit']),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erreur lors de la réception : ' . $e->getMessage()], 500);
        }
    }

    private function detecterOpportunitesTransferts(array $officineIds): array
    {
        if (count($officineIds) < 2) {
            return [];
        }

        $opportunites = [];

        // Récupérer tous les produits ayant du stock dans l'une des officines
        $stocksParOfficine = StockLot::whereIn('officine_id', $officineIds)
            ->where('statut', 'en_stock')
            ->where('quantite_disponible', '>', 0)
            ->with(['produit:id,nom_commercial,dosage,forme,code_cip', 'officine:id,nom,ville'])
            ->get()
            ->groupBy('produit_id');

        $officinesObj = Officine::whereIn('id', $officineIds)->get()->keyBy('id');

        foreach ($stocksParOfficine as $produitId => $lots) {
            $produit = $lots->first()->produit;
            if (! $produit) continue;

            $dispoParOfficine = [];
            foreach ($officineIds as $offId) {
                $lotsOff = $lots->where('officine_id', $offId);
                $dispoParOfficine[$offId] = [
                    'quantite' => $lotsOff->sum('quantite_disponible'),
                    'lot_plus_proche' => $lotsOff->sortBy('date_peremption')->first(),
                ];
            }

            // Vérifier s'il y a déséquilibre : une officine a >= 15 et une autre a <= 3
            foreach ($dispoParOfficine as $offSourceId => $sourceData) {
                if ($sourceData['quantite'] >= 15) {
                    foreach ($dispoParOfficine as $offDestId => $destData) {
                        if ($offSourceId !== $offDestId && $destData['quantite'] <= 3) {
                            $lotSource = $sourceData['lot_plus_proche'];
                            $qteSuggerer = min(10, (int) floor(($sourceData['quantite'] - $destData['quantite']) / 2));

                            if ($qteSuggerer > 0 && $lotSource) {
                                $opportunites[] = [
                                    'produit_id' => $produitId,
                                    'produit_nom' => $produit->nom_commercial . ' ' . ($produit->dosage ?? ''),
                                    'code_cip' => $produit->code_cip,
                                    'source_officine_id' => $offSourceId,
                                    'source_officine_nom' => $officinesObj[$offSourceId]->nom ?? 'Officine Source',
                                    'source_stock' => $sourceData['quantite'],
                                    'dest_officine_id' => $offDestId,
                                    'dest_officine_nom' => $officinesObj[$offDestId]->nom ?? 'Officine Cible',
                                    'dest_stock' => $destData['quantite'],
                                    'quantite_suggeree' => $qteSuggerer,
                                    'numero_lot' => $lotSource->numero_lot,
                                    'date_peremption' => $lotSource->date_peremption ? $lotSource->date_peremption->toDateString() : null,
                                    'stock_lot_id' => $lotSource->id,
                                    'prix_achat' => $lotSource->prix_achat_unitaire ?: 1000,
                                    'motif' => $destData['quantite'] === 0
                                        ? 'Rupture constatée chez le destinataire'
                                        : 'Équilibrage de stock et prévention de péremption FEFO',
                                ];
                            }
                        }
                    }
                }
            }
        }

        return array_slice($opportunites, 0, 8);
    }

    private function verifierPresencePharmacien(string $officineId): array
    {
        $today = now()->toDateString();

        $pharmaciens = DB::table('employes')
            ->where('officine_id', $officineId)
            ->whereIn('poste', ['pharmacien_titulaire', 'pharmacien_adjoint', 'pharmacien_remplacant', 'promoteur'])
            ->pluck('nom_complet', 'id');

        $surPlace = [];

        foreach ($pharmaciens as $id => $nom) {
            $dernierPointage = DB::table('pointages')
                ->where('officine_id', $officineId)
                ->where('employe_id', $id)
                ->whereDate('horodatage', $today)
                ->orderByDesc('horodatage')
                ->first();

            if ($dernierPointage && $dernierPointage->type === 'arrivee') {
                $surPlace[] = $nom;
            }
        }

        return [
            'present' => count($surPlace) > 0,
            'pharmaciens' => $surPlace,
        ];
    }
}

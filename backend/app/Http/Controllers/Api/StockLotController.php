<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Emplacement;
use App\Models\MouvementStock;
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

        // Filtre par statut étendu (§0.2) — accepte un ou plusieurs statuts séparés par des virgules
        if ($statut = $request->query('statut')) {
            $statuts = array_filter(array_map('trim', explode(',', (string) $statut)));
            $connus = ['commercialisable','en_attente_controle','a_evaluer','quarantaine','attente_retour','rejete','dechet','epuise','en_stock'];
            $statuts = array_values(array_intersect($statuts, $connus));

            if ($statuts) {
                $query->where(function ($q) use ($statuts) {
                    $q->whereIn('statut_detail', $statuts)->orWhereIn('statut', $statuts);
                    // le statut historique « en_stock » équivaut à « commercialisable »
                    if (in_array('commercialisable', $statuts) || in_array('en_stock', $statuts)) {
                        $q->orWhere('statut', 'en_stock');
                    }
                });
            }
        } elseif ($request->has('vendable')) {
            $vendable = filter_var($request->query('vendable'), FILTER_VALIDATE_BOOLEAN);

            if ($vendable) {
                $query->where(function ($q) {
                    $q->where('statut_detail', 'commercialisable')
                      ->orWhere(function ($sq) {
                          $sq->whereNull('statut_detail')->where('statut', 'en_stock');
                      });
                })
                ->where('quantite_disponible', '>', 0)
                ->where('date_peremption', '>=', Carbon::now());
            } else {
                // Lots NON délivrables : quarantaine, attente de contrôle, à évaluer,
                // retours, rejetés, périmés ou épuisés. Alimente la constitution
                // des lots de déchets et le registre des rappels.
                $query->where(function ($q) {
                    $q->whereIn('statut_detail', [
                        'quarantaine', 'en_attente_controle', 'a_evaluer',
                        'attente_retour', 'rejete', 'dechet', 'epuise',
                    ])
                    ->orWhereIn('statut', ['quarantaine', 'dechet', 'epuise'])
                    ->orWhere('date_peremption', '<', Carbon::now())
                    ->orWhere('quantite_disponible', '<=', 0);
                });
            }
        } else {
            // Par défaut : tout l'historique des lots encore détenus par l'officine,
            // y compris les lots retirés du circuit (déchets, épuisés) — un lot
            // détruit doit rester consultable dix ans.
            $query->where(function ($q) {
                $q->whereIn('statut_detail', ['commercialisable','quarantaine','en_attente_controle','a_evaluer','attente_retour','rejete','dechet','epuise'])
                  ->orWhereIn('statut', ['en_stock','quarantaine','dechet','epuise'])
                  ->orWhereNull('statut_detail');
            });
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
                ->where(function($q){ $q->where('statut_detail','commercialisable')->orWhere(function($sq){ $sq->whereNull('statut_detail')->where('statut','en_stock'); }); })
                ->count(),
            'valorisation_totale' => (float) StockLot::where('officine_id', $officineId)->where('quantite_disponible','>',0)->get()->sum(fn($l)=> $l->quantite_disponible * (float)($l->prix_achat_unitaire ?? 0)),
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
            'emplacement_id' => 'nullable|uuid|exists:emplacements,id',
            'prix_achat_unitaire' => 'nullable|numeric|min:0',
            'fournisseur_nom' => 'required|string|max:200',
            'bon_livraison_ref' => 'required|string|max:100',
            'controles_reception' => 'nullable|array',
            'controles_reception.alerte_sanitaire_verifiee' => 'boolean',
            'controles_reception.emballage_intact' => 'boolean',
            'controles_reception.conformite_livraison' => 'boolean',
            'controles_reception.dates_conformes' => 'boolean',
            'controles_reception.chaine_froid_respectee' => 'boolean',
        ]);

        $user = $request->user();
        $officineId = $user->officine_id;

        return DB::transaction(function () use ($validated, $user, $officineId) {
            $produit = Produit::findOrFail($validated['produit_id']);

            // Vérification unicité lot (INT-01 : unique par produit, lot, péremption)
            $existe = StockLot::where('officine_id', $officineId)
                ->where('produit_id', $produit->id)
                ->where('numero_lot', $validated['numero_lot'])
                ->where('date_peremption', $validated['date_peremption'])
                ->exists();
            if ($existe) {
                return response()->json(['message' => 'Lot déjà existant pour ce produit (INT-01)'], 422);
            }

            // Contrainte emplacement (STO-04)
            if (!empty($validated['emplacement_id'])) {
                $emp = Emplacement::where('officine_id', $officineId)->find($validated['emplacement_id']);
                if ($emp && !$emp->peutAccueillir($produit)) {
                    return response()->json(['message' => 'Emplacement incompatible : '.$emp->libelle.' n’accepte pas ce type de produit (STO-04)'], 422);
                }
            }

            $controles = $validated['controles_reception'] ?? null;
            $tousControlesOk = $controles ? (
                ($controles['alerte_sanitaire_verifiee'] ?? false) &&
                ($controles['emballage_intact'] ?? false) &&
                ($controles['conformite_livraison'] ?? false) &&
                ($controles['dates_conformes'] ?? false)
            ) : false;

            $statutDetail = $tousControlesOk ? 'commercialisable' : 'en_attente_controle';

            $lot = StockLot::create([
                'officine_id' => $officineId,
                'produit_id' => $produit->id,
                'numero_lot' => $validated['numero_lot'],
                'date_fabrication' => $validated['date_fabrication'] ?? null,
                'date_peremption' => $validated['date_peremption'],
                'date_reception' => now()->toDateString(),
                'quantite_initiale' => $validated['quantite'],
                'quantite_disponible' => $validated['quantite'],
                'emplacement' => $validated['emplacement'] ?? ($produit->est_thermolabile ? 'Réfrigérateur 2°C–8°C' : 'Rayonnage Principal'),
                'emplacement_id' => $validated['emplacement_id'] ?? null,
                'prix_achat_unitaire' => $validated['prix_achat_unitaire'] ?? $produit->prix_achat_ht,
                'cout_achat_total' => ($validated['prix_achat_unitaire'] ?? $produit->prix_achat_ht) * $validated['quantite'],
                'fournisseur_nom' => $validated['fournisseur_nom'],
                'bon_livraison_ref' => $validated['bon_livraison_ref'],
                'statut' => $statutDetail === 'commercialisable' ? 'en_stock' : 'quarantaine',
                'statut_detail' => $statutDetail,
                'controles_reception' => $controles,
                'date_changement_statut' => now(),
                'dernier_modificateur_id' => $user->id,
            ]);

            // Mouvement d'entrée (STO-09)
            MouvementStock::create([
                'officine_id' => $officineId,
                'stock_lot_id' => $lot->id,
                'produit_id' => $produit->id,
                'type_mouvement' => 'entree_reception',
                'quantite' => $validated['quantite'],
                'stock_avant' => 0,
                'stock_apres' => $validated['quantite'],
                'reference_piece' => $validated['bon_livraison_ref'],
                'auteur_id' => $user->id,
                'motif' => $tousControlesOk ? 'Réception conforme — commercialisable' : 'Réception en attente de contrôle',
                'metadonnees' => ['controles' => $controles],
            ]);

            // Mise à jour CMP produit (STO-18)
            $totalQte = StockLot::where('officine_id', $officineId)->where('produit_id', $produit->id)->sum('quantite_initiale');
            $totalValeur = StockLot::where('officine_id', $officineId)->where('produit_id', $produit->id)->get()->sum(fn($l)=> $l->quantite_initiale * (float)($l->prix_achat_unitaire ?? 0));
            if ($totalQte > 0) {
                $produit->update(['prix_achat_moyen' => $totalValeur / $totalQte]);
            }

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
        return $this->changerStatut($request, $id, 'quarantaine');
    }

    public function leverQuarantaine(Request $request, string $id): JsonResponse
    {
        $request->merge(['motif' => 'Levée de quarantaine documentée']);
        return $this->changerStatut($request, $id, 'commercialisable');
    }

    /**
     * Changement de statut générique §0.2 — effet immédiat caisse/dispensation (RG-D02)
     */
    public function changerStatut(Request $request, string $id, ?string $statutForce = null): JsonResponse
    {
        $validated = $request->validate([
            'motif' => 'required|string|min:5|max:500',
            'statut' => $statutForce ? 'nullable' : 'required|in:commercialisable,en_attente_controle,a_evaluer,quarantaine,attente_retour,rejete,dechet,epuise,en_stock,quarantaine',
        ]);

        $cible = $statutForce ?? $validated['statut'];
        // Normalisation
        if ($cible === 'en_stock') $cible = 'commercialisable';
        if ($cible === 'quarantaine') $cible = 'quarantaine';

        $user = $request->user();
        $role = $user->role;

        // Matrice §0.3 — qui peut modifier quoi
        $interdits = [
            'quarantaine' => ['caissier'],
            'attente_retour' => ['caissier','dispensateur'],
            'rejete' => ['magasinier','caissier','dispensateur'],
            'dechet' => ['magasinier','caissier','dispensateur'],
        ];
        if (isset($interdits[$cible]) && in_array($role, $interdits[$cible])) {
            return response()->json(['message' => 'Rôle non autorisé pour ce changement de statut (§0.3)'], 403);
        }

        $lot = StockLot::where('officine_id', $user->officine_id)->findOrFail($id);
        $ancien = $lot->statut_effectif;

        $lot->update([
            'statut' => in_array($cible, ['commercialisable']) ? 'en_stock' : (in_array($cible, ['quarantaine','en_attente_controle','a_evaluer','attente_retour']) ? 'quarantaine' : 'retire'),
            'statut_detail' => $cible,
            'motif_statut' => $validated['motif'],
            'motif_quarantaine' => $cible === 'quarantaine' ? $validated['motif'] : $lot->motif_quarantaine,
            'dernier_modificateur_id' => $user->id,
            'date_changement_statut' => now(),
        ]);

        MouvementStock::create([
            'officine_id' => $user->officine_id,
            'stock_lot_id' => $lot->id,
            'produit_id' => $lot->produit_id,
            'type_mouvement' => 'changement_statut',
            'quantite' => 0,
            'stock_avant' => $lot->quantite_disponible,
            'stock_apres' => $lot->quantite_disponible,
            'auteur_id' => $user->id,
            'motif' => "Statut: {$ancien} → {$cible} — {$validated['motif']}",
            'metadonnees' => ['ancien'=>$ancien,'nouveau'=>$cible],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Lot {$lot->numero_lot} → {$cible} (effet immédiat en caisse)",
            'data' => $lot->fresh(['produit','emplacementRef']),
        ]);
    }

    /**
     * Valorisation du stock (STO-18) — CMP par produit + total
     */
    public function valorisation(Request $request): JsonResponse
    {
        $officineId = $request->user()->officine_id;
        $lots = StockLot::where('officine_id', $officineId)->where('quantite_disponible','>',0)->with('produit')->get();
        $parProduit = $lots->groupBy('produit_id')->map(function($group){
            $prod = $group->first()->produit;
            return [
                'produit' => $prod,
                'quantite' => $group->sum('quantite_disponible'),
                'valeur' => $group->sum(fn($l)=> $l->quantite_disponible * (float)($l->prix_achat_unitaire ?? 0)),
                'cmp' => $prod->prix_achat_moyen ?? 0,
            ];
        })->values();

        $total = $parProduit->sum('valeur');

        return response()->json(['status'=>'success','data'=>['par_produit'=>$parProduit,'total'=>$total,'date'=>now()->toDateString()]]);
    }

    /**
     * Péremptions à 6/3/1 mois (STO-11)
     */
    public function peremptions(Request $request): JsonResponse
    {
        $officineId = $request->user()->officine_id;
        $today = Carbon::now()->startOfDay();
        $lots = StockLot::where('officine_id', $officineId)->where('quantite_disponible','>',0)->with('produit')->orderBy('date_peremption')->get();

        return response()->json(['status'=>'success','data'=>[
            'a_6_mois' => $lots->filter(fn($l)=> $l->date_peremption && Carbon::parse($l->date_peremption)->between($today, $today->copy()->addMonths(6)))->values(),
            'a_3_mois' => $lots->filter(fn($l)=> $l->date_peremption && Carbon::parse($l->date_peremption)->between($today, $today->copy()->addMonths(3)))->values(),
            'a_1_mois' => $lots->filter(fn($l)=> $l->date_peremption && Carbon::parse($l->date_peremption)->between($today, $today->copy()->addDays(30)))->values(),
            'perimes' => $lots->filter(fn($l)=> $l->date_peremption && Carbon::parse($l->date_peremption)->lt($today))->values(),
        ]]);
    }

    /**
     * Alertes globales (STO-13)
     */
    public function alertes(Request $request): JsonResponse
    {
        $officineId = $request->user()->officine_id;
        $today = Carbon::now();

        $ruptures = Produit::where(function($q) use ($officineId){ $q->whereNull('officine_id')->orWhere('officine_id',$officineId); })
            ->get()->filter(function($p) use ($officineId){
                $stock = StockLot::where('officine_id',$officineId)->where('produit_id',$p->id)->where('quantite_disponible','>',0)->sum('quantite_disponible');
                return $stock <= ($p->seuil_stock_min ?? 5) || $stock == 0;
            })->count();

        return response()->json(['status'=>'success','data'=>[
            'ruptures' => $ruptures,
            'lots_bloques' => StockLot::where('officine_id',$officineId)->whereIn('statut_detail',['quarantaine','a_evaluer','en_attente_controle'])->count(),
            'perimes' => StockLot::where('officine_id',$officineId)->where('date_peremption','<',$today)->where('quantite_disponible','>',0)->count(),
            'rappels_actifs' => \App\Models\AvisRappel::where('officine_id',$officineId)->where('statut','actif')->count(),
        ]]);
    }
}

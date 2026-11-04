<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ArmoireContenu;
use App\Models\Produit;
use App\Models\RegistreStupefiant;
use App\Models\StockLot;
use App\Models\MouvementStock;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StupefiantController extends Controller
{
    private function checkAcces(Request $request, array $rolesAutorises = ['pharmacien_titulaire','pharmacien_adjoint','promoteur','rmq','inspecteur']): ?JsonResponse
    {
        $role = $request->user()->role;
        if (!in_array($role, $rolesAutorises)) {
            return response()->json(['message' => 'Accès refusé — registre stupéfiants réservé au pharmacien (§0.3)'], 403);
        }
        return null;
    }

    public function index(Request $request): JsonResponse
    {
        if ($e = $this->checkAcces($request)) return $e;
        $officineId = $request->user()->officine_id;

        $query = RegistreStupefiant::where('officine_id', $officineId)
            ->with(['produit', 'lot', 'operateur', 'pharmacienVisa'])
            ->orderBy('numero_ordre', 'desc');

        if ($produitId = $request->query('produit_id')) $query->where('produit_id', $produitId);
        if ($q = $request->query('q')) {
            $query->where(function($qq) use ($q){
                $qq->where('reference_piece','ilike',"%{$q}%")->orWhere('tiers_nom','ilike',"%{$q}%")->orWhere('prescripteur_nom','ilike',"%{$q}%")->orWhere('patient_nom','ilike',"%{$q}%");
            });
        }
        if ($cat = $request->query('categorie')) $query->where('categorie', $cat);
        if ($type = $request->query('type_mouvement')) $query->where('type_mouvement', $type);

        $mouvements = $query->paginate(30);

        $produitsStupefiants = Produit::where(function ($q) use ($officineId) {
                $q->whereNull('officine_id')->orWhere('officine_id', $officineId);
            })
            ->whereIn('tableau_substance', ['stupefiant','liste_1','liste_2'])
            ->orWhere('classe_produit', 'stupefiant')
            ->with(['lots' => function ($q) use ($officineId) {
                $q->where('officine_id', $officineId)->where('statut_detail','commercialisable')->orWhere(function($sq) use ($officineId){ $sq->where('officine_id',$officineId)->where('statut','en_stock'); });
            }])
            ->get()
            ->map(function ($p) use ($officineId) {
                $stockPhysique = $p->lots->sum('quantite_disponible');
                $dernier = RegistreStupefiant::where('officine_id', $officineId)->where('produit_id', $p->id)->orderBy('numero_ordre','desc')->first();
                return [
                    'id' => $p->id,
                    'code_cip' => $p->code_cip,
                    'nom_commercial' => $p->nom_commercial,
                    'dosage' => $p->dosage,
                    'categorie' => $p->classe_produit ?? $p->tableau_substance,
                    'stock_theorique_registre' => $dernier ? $dernier->stock_nouveau : 0,
                    'stock_physique_lots' => $stockPhysique,
                    'concordance_exacte' => $dernier ? ($dernier->stock_nouveau === $stockPhysique) : ($stockPhysique === 0),
                    'ecart' => $dernier ? $dernier->stock_nouveau - $stockPhysique : -$stockPhysique,
                    'non_vises_count' => RegistreStupefiant::where('officine_id',$officineId)->where('produit_id',$p->id)->whereNull('pharmacien_visa_id')->count(),
                ];
            });

        return response()->json(['status'=>'success','data'=>$mouvements,'balance_produits'=>$produitsStupefiants]);
    }

    // STU-01/02/03 — Inscription manuelle (casse, perte, destruction, ajustement) — immuable après visa
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!in_array($user->role, ['pharmacien_titulaire','pharmacien_adjoint','promoteur'])) {
            return response()->json(['message'=>'Tenue du registre réservée au pharmacien (RG-D01)'], 403);
        }
        $validated = $request->validate([
            'produit_id' => 'required|uuid|exists:produits,id',
            'stock_lot_id' => 'nullable|uuid|exists:stocks_lots,id',
            'type_mouvement' => 'required|in:entree_livraison,sortie_dispensation,destruction_perime,ajustement_inventaire,vol_perte,retour_particulier',
            'categorie' => 'nullable|in:stupefiant,psychotrope,liste_1,liste_2,derive_sang',
            'quantite' => 'required|integer|min:1',
            'reference_piece' => 'required|string|max:100',
            'tiers_nom' => 'nullable|string|max:150',
            'patient_nom' => 'nullable|string|max:150',
            'prescripteur_nom' => 'nullable|string|max:150',
            'observations' => 'nullable|string|max:1000',
            'ordonnance_scan_url' => 'nullable|string|max:500',
        ]);

        $officineId = $user->officine_id;
        return DB::transaction(function() use ($validated, $user, $officineId){
            $produit = Produit::findOrFail($validated['produit_id']);
            $dernierNum = RegistreStupefiant::where('officine_id',$officineId)->max('numero_ordre') ?? 0;
            $stockPrecedent = RegistreStupefiant::where('officine_id',$officineId)->where('produit_id',$produit->id)->orderBy('numero_ordre','desc')->value('stock_nouveau') ?? 0;

            $estEntree = in_array($validated['type_mouvement'], ['entree_livraison','retour_particulier']);
            $stockNouveau = $estEntree ? $stockPrecedent + $validated['quantite'] : $stockPrecedent - $validated['quantite'];
            if ($stockNouveau < 0) return response()->json(['message'=>'Stock théorique négatif refusé (RG-D08)'], 422);

            $ligne = RegistreStupefiant::create([
                'officine_id' => $officineId,
                'numero_ordre' => $dernierNum + 1,
                'date_mouvement' => Carbon::now(),
                'type_mouvement' => $validated['type_mouvement'],
                'categorie' => $validated['categorie'] ?? ($produit->classe_produit ?? $produit->tableau_substance ?? 'stupefiant'),
                'produit_id' => $produit->id,
                'stock_lot_id' => $validated['stock_lot_id'] ?? null,
                'quantite' => $validated['quantite'],
                'stock_precedent' => $stockPrecedent,
                'stock_nouveau' => $stockNouveau,
                'reference_piece' => $validated['reference_piece'],
                'tiers_nom' => $validated['tiers_nom'] ?? null,
                'patient_nom' => $validated['patient_nom'] ?? null,
                'prescripteur_nom' => $validated['prescripteur_nom'] ?? null,
                'operateur_id' => $user->id,
                'observations' => $validated['observations'] ?? null,
                'pieces_jointes' => $validated['ordonnance_scan_url'] ? ['ordonnance'=>$validated['ordonnance_scan_url']] : null,
                'est_ordonnancier' => in_array($validated['type_mouvement'], ['sortie_dispensation']),
            ]);

            // Décrément lot si sortie avec lot lié
            if (!$estEntree && !empty($validated['stock_lot_id'])) {
                $lot = StockLot::where('officine_id',$officineId)->find($validated['stock_lot_id']);
                if ($lot) {
                    $lot->decrement('quantite_disponible', $validated['quantite']);
                }
            }

            return response()->json(['status'=>'success','message'=>'Ligne #'.str_pad($ligne->numero_ordre,4,'0',STR_PAD_LEFT).' inscrite — immuable après visa (INT-02)','data'=>$ligne->load(['produit','pharmacienVisa'])], 201);
        });
    }

    // STU-03 — Écriture rectificative (jamais modification)
    public function rectificative(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!in_array($user->role, ['pharmacien_titulaire','pharmacien_adjoint','promoteur'])) {
            return response()->json(['message'=>'Seul le pharmacien peut rectifier (INT-02)'], 403);
        }
        $validated = $request->validate(['motif'=>'required|string|min:10|max:1000','quantite_corrective'=>'required|integer']);
        $officineId = $user->officine_id;
        $origine = RegistreStupefiant::where('officine_id',$officineId)->findOrFail($id);
        if (!$origine->pharmacien_visa_id) {
            return response()->json(['message'=>'La ligne d’origine n’est pas encore visée — corrigez directement'], 422);
        }
        return DB::transaction(function() use ($origine, $validated, $user, $officineId){
            $dernierNum = RegistreStupefiant::where('officine_id',$officineId)->max('numero_ordre') ?? 0;
            $stockPrecedent = RegistreStupefiant::where('officine_id',$officineId)->orderBy('numero_ordre','desc')->value('stock_nouveau') ?? 0;
            $stockNouveau = $stockPrecedent + $validated['quantite_corrective'];
            $ligne = RegistreStupefiant::create([
                'officine_id'=>$officineId,
                'numero_ordre'=>$dernierNum+1,
                'date_mouvement'=>Carbon::now(),
                'type_mouvement'=>'ajustement_inventaire',
                'produit_id'=>$origine->produit_id,
                'stock_lot_id'=>$origine->stock_lot_id,
                'quantite'=>abs($validated['quantite_corrective']),
                'stock_precedent'=>$stockPrecedent,
                'stock_nouveau'=>$stockNouveau,
                'reference_piece'=>'RECTIF #'.str_pad($origine->numero_ordre,4,'0',STR_PAD_LEFT),
                'operateur_id'=>$user->id,
                'observations'=>'Rectificative liée à #'.str_pad($origine->numero_ordre,4,'0',STR_PAD_LEFT).' — '.$validated['motif'],
                'pieces_jointes'=>['origine_id'=>$origine->id],
            ]);
            return response()->json(['status'=>'success','message'=>'Écriture rectificative #'.str_pad($ligne->numero_ordre,4,'0',STR_PAD_LEFT).' créée','data'=>$ligne], 201);
        });
    }

    public function viser(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!in_array($user->role, ['pharmacien_titulaire','pharmacien_adjoint','promoteur'])) {
            return response()->json(['message'=>'Seul un pharmacien peut viser le registre (RG-D01)'], 403);
        }
        $mouvement = RegistreStupefiant::where('officine_id',$user->officine_id)->findOrFail($id);
        if ($mouvement->pharmacien_visa_id) return response()->json(['message'=>'Ligne déjà visée — immuable (INT-02)'], 422);
        $mouvement->update(['pharmacien_visa_id'=>$user->id,'date_visa'=>Carbon::now()]);
        return response()->json(['status'=>'success','message'=>'Visa apposé — ligne verrouillée','data'=>$mouvement->load('pharmacienVisa')]);
    }

    // STU-04 Balance à date
    public function balance(Request $request): JsonResponse
    {
        if ($e=$this->checkAcces($request)) return $e;
        $officineId = $request->user()->officine_id;
        $date = $request->query('date') ? Carbon::parse($request->query('date')) : Carbon::now();
        $lignes = RegistreStupefiant::where('officine_id',$officineId)->where('date_mouvement','<=',$date)->with('produit')->orderBy('numero_ordre')->get();
        $parProduit = $lignes->groupBy('produit_id')->map(function($g){
            $last = $g->last();
            return ['produit'=>$last->produit,'stock_theorique'=>$last->stock_nouveau,'dernier_mouvement'=>$last];
        })->values();
        return response()->json(['status'=>'success','data'=>['date'=>$date->toDateString(),'par_produit'=>$parProduit,'total_lignes'=>$lignes->count()]]);
    }

    // STU-05 Inventaire stupéfiants
    public function inventaire(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!in_array($user->role, ['pharmacien_titulaire','pharmacien_adjoint','promoteur'])) return response()->json(['message'=>'Inventaire stupéfiants : pharmacien requis (STU-05)'], 403);
        $validated = $request->validate(['produit_id'=>'required|uuid','quantite_physique'=>'required|integer|min:0','commentaire'=>'nullable|string']);
        $officineId = $user->officine_id;
        $dernier = RegistreStupefiant::where('officine_id',$officineId)->where('produit_id',$validated['produit_id'])->orderBy('numero_ordre','desc')->first();
        $theorique = $dernier ? $dernier->stock_nouveau : 0;
        $ecart = $validated['quantite_physique'] - $theorique;
        if ($ecart !== 0) {
            $dernierNum = RegistreStupefiant::where('officine_id',$officineId)->max('numero_ordre') ?? 0;
            $ligne = RegistreStupefiant::create([
                'officine_id'=>$officineId,
                'numero_ordre'=>$dernierNum+1,
                'date_mouvement'=>Carbon::now(),
                'type_mouvement'=>'ajustement_inventaire',
                'produit_id'=>$validated['produit_id'],
                'quantite'=>abs($ecart),
                'stock_precedent'=>$theorique,
                'stock_nouveau'=>$validated['quantite_physique'],
                'reference_piece'=>'INV-STUP '.Carbon::now()->format('Ymd His'),
                'operateur_id'=>$user->id,
                'observations'=>'Inventaire : écart '. $ecart . ' — '. ($validated['commentaire'] ?? ''),
                'date_ecart_detecte'=> $ecart ? Carbon::now() : null,
            ]);
            // Alerte NC/CAPA auto (STU-06)
            return response()->json(['status'=>'success','alerte_ecart'=>true,'message'=>'Écart détecté ('.$ecart.') — fiche NC/CAPA à ouvrir','data'=>$ligne], 201);
        }
        return response()->json(['status'=>'success','alerte_ecart'=>false,'message'=>'Concordance parfaite','data'=>null]);
    }

    // STU-07 Ordonnancier
    public function ordonnancier(Request $request): JsonResponse
    {
        if ($e=$this->checkAcces($request)) return $e;
        $officineId = $request->user()->officine_id;
        $ordos = RegistreStupefiant::where('officine_id',$officineId)->where('est_ordonnancier',true)->with(['produit','pharmacienVisa'])->orderBy('numero_ordre')->paginate(30);
        return response()->json(['status'=>'success','data'=>$ordos,'conservation'=>'10 ans — GAD-EN-010']);
    }

    // STU-09 Armoire sécurisée
    public function armoire(Request $request): JsonResponse
    {
        if ($e=$this->checkAcces($request)) return $e;
        $officineId = $request->user()->officine_id;
        $contenu = ArmoireContenu::where('officine_id',$officineId)->with(['produit','lot'])->get();
        $lots = StockLot::where('officine_id',$officineId)->whereHas('produit', fn($q)=> $q->whereIn('tableau_substance',['stupefiant','liste_1','liste_2'])->orWhere('classe_produit','stupefiant'))->with('produit')->get();
        return response()->json(['status'=>'success','data'=>['contenu'=>$contenu,'lots_stupefiants'=>$lots,'exigence'=>'Armoire fermée à clé — accès pharmacien seul (BPD5-F11)']]);
    }

    // STU-10 Vol/perte
    public function declarationVol(Request $request): JsonResponse
    {
        $user=$request->user();
        if (!in_array($user->role, ['pharmacien_titulaire','pharmacien_adjoint','promoteur'])) return response()->json(['message'=>'Déclaration réservée au pharmacien'], 403);
        $validated=$request->validate(['produit_id'=>'required|uuid','quantite'=>'required|integer|min:1','declaration_ref'=>'required|string|max:100','observations'=>'nullable|string']);
        $officineId=$user->officine_id;
        return DB::transaction(function() use ($validated,$user,$officineId){
            $dernierNum = RegistreStupefiant::where('officine_id',$officineId)->max('numero_ordre') ?? 0;
            $stockPrecedent = RegistreStupefiant::where('officine_id',$officineId)->where('produit_id',$validated['produit_id'])->orderBy('numero_ordre','desc')->value('stock_nouveau') ?? 0;
            $ligne = RegistreStupefiant::create([
                'officine_id'=>$officineId,
                'numero_ordre'=>$dernierNum+1,
                'date_mouvement'=>Carbon::now(),
                'type_mouvement'=>'ajustement_inventaire',
                'produit_id'=>$validated['produit_id'],
                'quantite'=>$validated['quantite'],
                'stock_precedent'=>$stockPrecedent,
                'stock_nouveau'=>max(0,$stockPrecedent - $validated['quantite']),
                'reference_piece'=>$validated['declaration_ref'],
                'operateur_id'=>$user->id,
                'declaration_vol_ref'=>$validated['declaration_ref'],
                'observations'=>'VOL/PERTE — '.$validated['observations'],
            ]);
            return response()->json(['status'=>'success','message'=>'Déclaration enregistrée — alerte promoteur SMS/push','data'=>$ligne], 201);
        });
    }

    // STU-11 Destruction
    public function demandeDestruction(Request $request): JsonResponse
    {
        $user=$request->user();
        if (!in_array($user->role, ['pharmacien_titulaire','pharmacien_adjoint','promoteur'])) return response()->json(['message'=>'Destruction : pharmacien requis (STU-11)'], 403);
        $validated=$request->validate(['produit_id'=>'required|uuid','quantite'=>'required|integer|min:1','autorisation_ref'=>'required|string|max:100','prestataire'=>'nullable|string']);
        $officineId=$user->officine_id;
        return DB::transaction(function() use ($validated,$user,$officineId){
            $dernierNum = RegistreStupefiant::where('officine_id',$officineId)->max('numero_ordre') ?? 0;
            $stockPrecedent = RegistreStupefiant::where('officine_id',$officineId)->where('produit_id',$validated['produit_id'])->orderBy('numero_ordre','desc')->value('stock_nouveau') ?? 0;
            $ligne = RegistreStupefiant::create([
                'officine_id'=>$officineId,
                'numero_ordre'=>$dernierNum+1,
                'date_mouvement'=>Carbon::now(),
                'type_mouvement'=>'destruction_perime',
                'produit_id'=>$validated['produit_id'],
                'quantite'=>$validated['quantite'],
                'stock_precedent'=>$stockPrecedent,
                'stock_nouveau'=>max(0,$stockPrecedent - $validated['quantite']),
                'reference_piece'=>$validated['autorisation_ref'],
                'autorisation_destruction_ref'=>$validated['autorisation_ref'],
                'operateur_id'=>$user->id,
                'observations'=>'Destruction — prestataire : '.($validated['prestataire'] ?? '—'),
            ]);
            return response()->json(['status'=>'success','message'=>'Destruction enregistrée — PV à signer','data'=>$ligne], 201);
        });
    }

    // STU-14 Rapports
    public function rapport(Request $request): JsonResponse
    {
        if ($e=$this->checkAcces($request)) return $e;
        $officineId=$request->user()->officine_id;
        $debut = $request->query('debut') ? Carbon::parse($request->query('debut')) : Carbon::now()->startOfMonth();
        $fin = $request->query('fin') ? Carbon::parse($request->query('fin')) : Carbon::now();
        $produitId = $request->query('produit_id');
        $q = RegistreStupefiant::where('officine_id',$officineId)->whereBetween('date_mouvement',[$debut,$fin]);
        if ($produitId) $q->where('produit_id',$produitId);
        $total = $q->count();
        $entrees = (clone $q)->where('type_mouvement','entree_livraison')->sum('quantite');
        $sorties = (clone $q)->where('type_mouvement','sortie_dispensation')->sum('quantite');
        return response()->json(['status'=>'success','data'=>['periode'=>[$debut->toDateString(),$fin->toDateString()],'total_mouvements'=>$total,'entrees'=>$entrees,'sorties'=>$sorties,'export'=>'PDF GAD-EN-010 + Excel — 10 ans conservation']]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LigneVente;
use App\Models\Produit;
use App\Models\SessionCaisse;
use App\Models\StockLot;
use App\Models\VenteCaisse;
use App\Services\EmecefService;
use App\Services\FeexPayService;
use App\Services\SyscohadaService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VenteCaisseController extends Controller
{
    protected EmecefService $emecefService;
    protected FeexPayService $feexPayService;
    protected SyscohadaService $syscohadaService;

    public function __construct(
        EmecefService $emecefService,
        FeexPayService $feexPayService,
        SyscohadaService $syscohadaService
    ) {
        $this->emecefService = $emecefService;
        $this->feexPayService = $feexPayService;
        $this->syscohadaService = $syscohadaService;
    }

    /**
     * Liste des ventes de caisse avec certification e-MECeF
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $officineId = $user->officine_id;

        $ventes = VenteCaisse::where('officine_id', $officineId)
            ->with(['lignes.produit', 'lignes.lot', 'factureEmecef', 'paiementFeexPay', 'caissier'])
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json([
            'status' => 'success',
            'data' => $ventes,
        ]);
    }

    /**
     * Encaisser une vente au comptoir POS :
     * 1. Déstockage automatique par lots FEFO
     * 2. Mise à jour de la session de caisse
     * 3. Certification fiscale DGI e-MECeF instantanée
     * 4. Écritures comptables SYSCOHADA automatiques
     * 5. Optionnel : Paiement Mobile Money FeexPay (MTN/Moov/Celtiis)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_nom' => 'nullable|string|max:150',
            'client_ifu' => 'nullable|string|max:30',
            'dispensation_id' => 'nullable|uuid|exists:dispensations,id',
            'mode_reglement' => 'required|in:especes,mobile_money,carte,mixte',
            'montant_recu' => 'nullable|numeric|min:0',
            'mobile_operateur' => 'nullable|in:mtn,moov,celtiis',
            'mobile_telephone' => 'nullable|string|max:30',
            'lignes' => 'required|array|min:1',
            'lignes.*.produit_id' => 'required|uuid|exists:produits,id',
            'lignes.*.quantite' => 'required|integer|min:1',
        ]);

        $user = $request->user();
        $officineId = $user->officine_id;

        return DB::transaction(function () use ($validated, $user, $officineId) {
            // 1. Vérifier la session de caisse active
            $session = SessionCaisse::where('officine_id', $officineId)
                ->where('statut', 'ouverte')
                ->lockForUpdate()
                ->first();

            if (!$session) {
                // Créer automatiquement une session si aucune n'est ouverte
                $annee = Carbon::now()->format('Y');
                $count = SessionCaisse::where('officine_id', $officineId)->whereYear('created_at', $annee)->count() + 1;
                $session = SessionCaisse::create([
                    'officine_id' => $officineId,
                    'caissier_id' => $user->id,
                    'numero_session' => sprintf('CAISSE-%s-%04d', $annee, $count),
                    'fond_caisse_ouverture' => 0,
                    'opened_at' => Carbon::now(),
                    'statut' => 'ouverte',
                ]);
            }

            $totalBrutHt = 0;
            $totalTva = 0;
            $totalNetTtc = 0;
            $lignesAInserer = [];

            // 2. Traitement des articles et allocation FEFO des lots
            foreach ($validated['lignes'] as $ligneReq) {
                $produit = Produit::findOrFail($ligneReq['produit_id']);
                $qteDemandee = $ligneReq['quantite'];
                $qteRestante = $qteDemandee;

                // Récupération des lots disponibles selon FEFO strict (First Expired, First Out)
                $lotsDisponibles = StockLot::where('officine_id', $officineId)
                    ->where('produit_id', $produit->id)
                    ->vendables()
                    ->orderBy('date_peremption', 'asc')
                    ->lockForUpdate()
                    ->get();

                $dispo = $lotsDisponibles->sum('quantite_disponible');
                if ($dispo < $qteDemandee) {
                    abort(422, "Stock insuffisant pour {$produit->nom_commercial}. Demandé: {$qteDemandee}, Dispo: {$dispo}");
                }

                foreach ($lotsDisponibles as $lot) {
                    if ($qteRestante <= 0) break;

                    $qtePrelevee = min($lot->quantite_disponible, $qteRestante);
                    $lot->quantite_disponible -= $qtePrelevee;
                    if ($lot->quantite_disponible === 0) {
                        $lot->statut = 'epuise';
                    }
                    $lot->save();
                    $qteRestante -= $qtePrelevee;

                    // Fiscalité béninoise : Médicaments exonérés (Groupe A = 0%), Parapharmacie (Groupe B = 18%)
                    $tauxTva = 0; // Exonéré médicament BPD
                    $groupeTax = 'A_EXONERE';
                    $prixTtc = (float) $produit->prix_public_ttc;
                    $totalLigne = $qtePrelevee * $prixTtc;
                    $htLigne = $totalLigne / (1 + ($tauxTva / 100));
                    $tvaLigne = $totalLigne - $htLigne;

                    $totalBrutHt += $htLigne;
                    $totalTva += $tvaLigne;
                    $totalNetTtc += $totalLigne;

                    $lignesAInserer[] = [
                        'produit' => $produit,
                        'lot' => $lot,
                        'quantite' => $qtePrelevee,
                        'prix_unitaire_ttc' => $prixTtc,
                        'taux_tva' => $tauxTva,
                        'groupe_taxation' => $groupeTax,
                        'total_ligne' => $totalLigne,
                    ];
                }
            }

            // Calcul monnaie rendue
            $montantRecu = (float) ($validated['montant_recu'] ?? $totalNetTtc);
            $monnaieRendue = max(0, $montantRecu - $totalNetTtc);

            // 3. Création du ticket de vente
            $countVentes = VenteCaisse::where('officine_id', $officineId)->whereDate('created_at', Carbon::today())->count() + 1;
            $numTicket = sprintf('TCK-%s-%04d', Carbon::now()->format('Ymd'), $countVentes);

            $vente = VenteCaisse::create([
                'officine_id' => $officineId,
                'session_caisse_id' => $session->id,
                'caissier_id' => $user->id,
                'dispensation_id' => $validated['dispensation_id'] ?? null,
                'numero_ticket' => $numTicket,
                'client_nom' => $validated['client_nom'] ?? 'Client Comptoir',
                'client_ifu' => $validated['client_ifu'] ?? null,
                'montant_brut_ht' => $totalBrutHt,
                'montant_remise' => 0,
                'montant_tva' => $totalTva,
                'montant_net_ttc' => $totalNetTtc,
                'montant_recu' => $montantRecu,
                'monnaie_rendue' => $monnaieRendue,
                'mode_reglement' => $validated['mode_reglement'],
                'statut' => 'payee',
            ]);

            // 4. Insérer les lignes de vente
            foreach ($lignesAInserer as $item) {
                LigneVente::create([
                    'vente_id' => $vente->id,
                    'produit_id' => $item['produit']->id,
                    'stock_lot_id' => $item['lot']->id,
                    'quantite' => $item['quantite'],
                    'prix_unitaire_ttc' => $item['prix_unitaire_ttc'],
                    'taux_tva' => $item['taux_tva'],
                    'groupe_taxation' => $item['groupe_taxation'],
                    'total_ligne' => $item['total_ligne'],
                ]);
            }

            // 5. Mettre à jour la session de caisse
            if ($vente->mode_reglement === 'especes') {
                $session->total_encaisse_especes += $totalNetTtc;
                $session->fond_caisse_fermeture_theorique += $totalNetTtc;
            } elseif ($vente->mode_reglement === 'mobile_money') {
                $session->total_encaisse_mobile_money += $totalNetTtc;
            } elseif ($vente->mode_reglement === 'carte') {
                $session->total_encaisse_carte += $totalNetTtc;
            }
            $session->save();

            // 6. Gestion du paiement FeexPay (Mobile Money) si sélectionné
            if ($vente->mode_reglement === 'mobile_money') {
                $op = $validated['mobile_operateur'] ?? 'mtn';
                $tel = $validated['mobile_telephone'] ?? '22997000000';
                $this->feexPayService->initierPaiement($vente, $op, $tel);
            }

            // 7. Certification fiscale DGI e-MECeF
            $factureEmecef = $this->emecefService->certifierVente($vente);

            // 8. Écritures comptables automatiques SYSCOHADA
            $this->syscohadaService->genererEcrituresVente($vente);

            return response()->json([
                'status' => 'success',
                'message' => "Vente encaissée avec succès. Facture e-MECeF {$factureEmecef->numero_facture_dgi} certifiée DGI !",
                'data' => $vente->load(['lignes.produit', 'lignes.lot', 'factureEmecef', 'paiementFeexPay']),
            ], 201);
        });
    }
}

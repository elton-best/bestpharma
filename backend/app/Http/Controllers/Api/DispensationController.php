<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dispensation;
use App\Models\LigneDispensation;
use App\Models\Ordonnance;
use App\Models\Patient;
use App\Models\Prescripteur;
use App\Models\Produit;
use App\Models\RegistreStupefiant;
use App\Models\StockLot;
use App\Services\SecuriteCliniqueService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DispensationController extends Controller
{
    public function __construct(
        protected SecuriteCliniqueService $securiteClinique
    ) {}

    protected function getOfficineId(Request $request): string
    {
        $user = $request->user();
        return $request->header('X-Officine-Id')
            ?? $user->officine_id
            ?? $user->officines()->wherePivot('actif', true)->value('officines.id')
            ?? abort(400, "Aucune officine active n'est rattachée à cet utilisateur.");
    }

    /**
     * Liste chronologique de l'ordonnancier et des dispensations
     */
    public function index(Request $request): JsonResponse
    {
        $officineId = $this->getOfficineId($request);

        $dispensations = Dispensation::where('officine_id', $officineId)
            ->with(['patient', 'ordonnance', 'prescripteur', 'lignes.produit', 'lignes.lot', 'dispensateur', 'pharmacien'])
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json([
            'status' => 'success',
            'data' => $dispensations,
        ]);
    }

    /**
     * Exécuter une dispensation avec sélection automatique FEFO et décrémentation des stocks
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type_dispensation' => 'required|in:ordonnance,conseil_sans_ordonnance',
            'patient_id' => 'nullable|uuid|exists:patients,id',
            'ordonnance_id' => 'nullable|uuid|exists:ordonnances,id',
            'prescripteur_id' => 'nullable|uuid|exists:prescripteurs,id',
            'patient_nom' => 'nullable|string|max:150',
            'patient_age' => 'nullable|integer|min:0|max:130',
            'patient_telephone' => 'nullable|string|max:50',
            'prescripteur_nom' => 'nullable|string|max:150',
            'prescripteur_titre' => 'nullable|string|max:100',
            'prescripteur_centre' => 'nullable|string|max:150',
            'date_ordonnance' => 'nullable|date',
            'commentaires_posologie' => 'nullable|string',
            'forcer_alertes' => 'nullable|boolean',
            'lignes' => 'required|array|min:1',
            'lignes.*.produit_id' => 'required|uuid|exists:produits,id',
            'lignes.*.quantite' => 'required|integer|min:1',
            'lignes.*.posologie' => 'nullable|string|max:255',
            'lignes.*.duree_traitement' => 'nullable|string|max:100',
        ]);

        $user = $request->user();
        $officineId = $this->getOfficineId($request);

        // 1. Récupération et cohérence du patient
        $patient = null;
        if (! empty($validated['patient_id'])) {
            $patient = Patient::where('officine_id', $officineId)
                ->where('id', $validated['patient_id'])
                ->firstOrFail();
            $patientNom = "{$patient->nom} {$patient->prenom}";
            $patientAge = $patient->age;
            $patientTel = $patient->telephone;
        } else {
            $patientNom = $validated['patient_nom'] ?? 'Patient comptoir';
            $patientAge = $validated['patient_age'] ?? null;
            $patientTel = $validated['patient_telephone'] ?? null;
        }

        // 2. Récupération et contrôle de l'ordonnance
        $ordonnance = null;
        if (! empty($validated['ordonnance_id'])) {
            $ordonnance = Ordonnance::where('officine_id', $officineId)
                ->where('id', $validated['ordonnance_id'])
                ->firstOrFail();

            if (! empty($ordonnance->prescripteur_id) && empty($validated['prescripteur_id'])) {
                $validated['prescripteur_id'] = $ordonnance->prescripteur_id;
            }
        }

        // 3. Analyse de sécurité clinique (Allergies, Grossesse, Redondances BPD Art. 7.1)
        $alertes = $this->securiteClinique->analyserRisques($patient, $validated['lignes']);
        $aAlerteBloquante = collect($alertes)->contains('severite', 'critique');

        if ($aAlerteBloquante && empty($validated['forcer_alertes'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Dispensation bloquée par le moteur de sécurité clinique (risque vital ou allergie majeure).',
                'bloquant' => true,
                'alertes' => $alertes,
            ], 422);
        }

        return DB::transaction(function () use ($validated, $user, $officineId, $patient, $patientNom, $patientAge, $patientTel, $ordonnance, $alertes) {
            $totalDispensation = 0;
            $lignesAInserer = [];

            // 1. Pour chaque produit demandé, allouer les lots disponibles selon FEFO strict (First Expired, First Out)
            foreach ($validated['lignes'] as $ligneReq) {
                $produit = Produit::findOrFail($ligneReq['produit_id']);
                $quantiteDemandee = $ligneReq['quantite'];
                $quantiteRestante = $quantiteDemandee;

                // Récupération des lots valides classés par date_peremption ASC (FEFO)
                $lotsDisponibles = StockLot::where('officine_id', $officineId)
                    ->where('produit_id', $produit->id)
                    ->vendables()
                    ->orderBy('date_peremption', 'asc')
                    ->lockForUpdate()
                    ->get();

                $stockTotalDisponible = $lotsDisponibles->sum('quantite_disponible');
                if ($stockTotalDisponible < $quantiteDemandee) {
                    abort(422, "Stock insuffisant pour {$produit->nom_commercial}. Demandé: {$quantiteDemandee}, Disponible (FEFO valide): {$stockTotalDisponible}");
                }

                foreach ($lotsDisponibles as $lot) {
                    if ($quantiteRestante <= 0) {
                        break;
                    }

                    $quantitePrelevee = min($lot->quantite_disponible, $quantiteRestante);
                    $lot->quantite_disponible -= $quantitePrelevee;
                    if ($lot->quantite_disponible === 0) {
                        $lot->statut = 'epuise';
                    }
                    $lot->save();

                    $quantiteRestante -= $quantitePrelevee;
                    $prixUnitaire = (float) $produit->prix_public_ttc;
                    $montantLigne = $quantitePrelevee * $prixUnitaire;
                    $totalDispensation += $montantLigne;

                    $lignesAInserer[] = [
                        'produit' => $produit,
                        'lot' => $lot,
                        'quantite' => $quantitePrelevee,
                        'prix_unitaire' => $prixUnitaire,
                        'montant_ligne' => $montantLigne,
                        'posologie' => $ligneReq['posologie'] ?? null,
                        'duree_traitement' => $ligneReq['duree_traitement'] ?? null,
                    ];
                }
            }

            // 2. Générer le numéro de dispensation séquentiel
            $annee = Carbon::now()->format('Y');
            $countDisp = Dispensation::where('officine_id', $officineId)->whereYear('created_at', $annee)->count() + 1;
            $numDisp = sprintf('DISP-%s-%05d', $annee, $countDisp);

            $dispensation = Dispensation::create([
                'officine_id' => $officineId,
                'numero_dispensation' => $numDisp,
                'type_dispensation' => $validated['type_dispensation'],
                'patient_id' => $patient?->id,
                'ordonnance_id' => $ordonnance?->id,
                'prescripteur_id' => $validated['prescripteur_id'] ?? null,
                'patient_nom' => $patientNom,
                'patient_age' => $patientAge,
                'patient_telephone' => $patientTel,
                'prescripteur_nom' => $validated['prescripteur_nom'] ?? $ordonnance?->prescripteur_nom_libre ?? $ordonnance?->prescripteur?->nom_complet ?? null,
                'prescripteur_titre' => $validated['prescripteur_titre'] ?? $ordonnance?->prescripteur?->titre ?? null,
                'prescripteur_centre' => $validated['prescripteur_centre'] ?? $ordonnance?->prescripteur_centre_libre ?? $ordonnance?->prescripteur?->centre_sante ?? null,
                'date_ordonnance' => $validated['date_ordonnance'] ?? $ordonnance?->date_prescription ?? Carbon::now(),
                'montant_total' => $totalDispensation,
                'statut' => 'validee',
                'dispensateur_id' => $user->id,
                'pharmacien_id' => in_array($user->role, ['pharmacien_titulaire', 'pharmacien_adjoint']) ? $user->id : null,
                'commentaires_posologie' => $validated['commentaires_posologie'] ?? null,
                'alertes_detectees' => ! empty($alertes) ? $alertes : null,
            ]);

            // 3. Mise à jour de l'ordonnance si rattachée
            if ($ordonnance) {
                $ordonnance->increment('nombre_renouvellements_effectues');
                if ($ordonnance->nombre_renouvellements_effectues >= $ordonnance->nombre_renouvellements_autorises) {
                    $ordonnance->update(['statut' => 'cloturee']);
                }
            }

            // 4. Insérer les lignes rattachées aux lots FEFO et alimenter le registre des stupéfiants si nécessaire
            foreach ($lignesAInserer as $item) {
                LigneDispensation::create([
                    'dispensation_id' => $dispensation->id,
                    'produit_id' => $item['produit']->id,
                    'stock_lot_id' => $item['lot']->id,
                    'quantite' => $item['quantite'],
                    'prix_unitaire' => $item['prix_unitaire'],
                    'montant_ligne' => $item['montant_ligne'],
                    'posologie' => $item['posologie'],
                    'duree_traitement' => $item['duree_traitement'],
                ]);

                // Si le produit est un stupéfiant, enregistrement immédiat dans le registre officiel (Art. 7.15 BPD)
                if ($item['produit']->tableau_substance === 'stupefiant') {
                    $dernierNumOrdre = RegistreStupefiant::where('officine_id', $officineId)->max('numero_ordre') ?? 0;
                    $stockPrecedent = $item['lot']->quantite_disponible + $item['quantite'];

                    RegistreStupefiant::create([
                        'officine_id' => $officineId,
                        'numero_ordre' => $dernierNumOrdre + 1,
                        'date_mouvement' => Carbon::now(),
                        'type_mouvement' => 'sortie_dispensation',
                        'produit_id' => $item['produit']->id,
                        'stock_lot_id' => $item['lot']->id,
                        'quantite' => $item['quantite'],
                        'stock_precedent' => $stockPrecedent,
                        'stock_nouveau' => $item['lot']->quantite_disponible,
                        'reference_piece' => $dispensation->numero_dispensation,
                        'tiers_nom' => $dispensation->patient_nom,
                        'prescripteur_nom' => $dispensation->prescripteur_nom,
                        'operateur_id' => $user->id,
                        'pharmacien_visa_id' => in_array($user->role, ['pharmacien_titulaire', 'pharmacien_adjoint']) ? $user->id : null,
                        'date_visa' => in_array($user->role, ['pharmacien_titulaire', 'pharmacien_adjoint']) ? Carbon::now() : null,
                        'observations' => "Délivrance ordonnance pour {$dispensation->patient_nom} (Lot {$item['lot']->numero_lot})",
                    ]);
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => "Dispensation {$dispensation->numero_dispensation} validée avec succès avec allocation FEFO",
                'alertes_cliniques' => $alertes,
                'data' => $dispensation->load(['patient', 'ordonnance', 'lignes.produit', 'lignes.lot', 'dispensateur']),
            ], 201);
        });
    }

    /**
     * Visa formel du Pharmacien Titulaire / Adjoint sur une délivrance
     */
    public function viser(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!in_array($user->role, ['pharmacien_titulaire', 'pharmacien_adjoint', 'promoteur'])) {
            return response()->json(['message' => 'Seul un pharmacien diplômé peut viser une dispensation.'], 403);
        }

        $officineId = $this->getOfficineId($request);
        $dispensation = Dispensation::where('officine_id', $officineId)->findOrFail($id);
        $dispensation->update([
            'pharmacien_id' => $user->id,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Dispensation visée avec succès par le pharmacien',
            'data' => $dispensation->load('pharmacien'),
        ]);
    }
}

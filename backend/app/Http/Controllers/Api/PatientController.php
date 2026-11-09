<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Services\SecuriteCliniqueService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PatientController extends Controller
{
    public function __construct(
        protected SecuriteCliniqueService $securiteClinique
    ) {}

    protected function getOfficineId(Request $request): string
    {
        $user = $request->user();
        $officineId = $request->header('X-Officine-Id')
            ?? $user->officine_id
            ?? $user->officines()->wherePivot('actif', true)->value('officines.id');

        if (! $officineId) {
            abort(400, "Aucune officine active n'est rattachée à cet utilisateur.");
        }

        return $officineId;
    }

    /**
     * Liste des dossiers patients de l'officine (avec recherche textuelle)
     */
    public function index(Request $request): JsonResponse
    {
        $officineId = $this->getOfficineId($request);

        $query = Patient::where('officine_id', $officineId);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('nom', 'ilike', "%{$search}%")
                    ->orWhere('prenom', 'ilike', "%{$search}%")
                    ->orWhere('code_patient', 'ilike', "%{$search}%")
                    ->orWhere('telephone', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('sexe')) {
            $query->where('sexe', $request->input('sexe'));
        }

        if ($request->boolean('est_enceinte')) {
            $query->where('est_enceinte', true);
        }

        if ($request->boolean('est_allaitante')) {
            $query->where('est_allaitante', true);
        }

        $patients = $query->withCount(['ordonnances', 'dispensations'])
            ->orderBy('nom')
            ->orderBy('prenom')
            ->paginate($request->integer('per_page', 20));

        return response()->json([
            'status' => 'success',
            'data' => $patients,
        ]);
    }

    /**
     * Création d'un dossier patient pharmaceutique (BPD Art. 7.1)
     */
    public function store(Request $request): JsonResponse
    {
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'nom' => 'required|string|max:100',
            'prenom' => 'required|string|max:100',
            'sexe' => 'required|in:M,F',
            'date_naissance' => 'required|date|before:tomorrow',
            'telephone' => 'required|string|max:50',
            'email' => 'nullable|email|max:150',
            'adresse' => 'nullable|string|max:255',
            'ville' => 'nullable|string|max:100',
            'groupe_sanguin' => 'nullable|string|max:10',
            'poids_kg' => 'nullable|numeric|min:0.5|max:300',
            'taille_cm' => 'nullable|numeric|min:20|max:250',
            'est_enceinte' => 'nullable|boolean',
            'est_allaitante' => 'nullable|boolean',
            'pathologies_chroniques' => 'nullable|array',
            'pathologies_chroniques.*' => 'string|max:100',
            'allergies_declarees' => 'nullable|array',
            'allergies_declarees.*' => 'string|max:100',
            'notes_cliniques' => 'nullable|string',
            'consentement_dp' => 'nullable|boolean',
        ]);

        $annee = Carbon::now()->year;
        $dernierCompteur = Patient::where('officine_id', $officineId)->count() + 1;
        $codePatient = sprintf('PAT-%d-%04d', $annee, $dernierCompteur);

        $dateNaissance = Carbon::parse($validated['date_naissance']);
        $age = $dateNaissance->age;

        $patient = Patient::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $officineId,
            'code_patient' => $codePatient,
            'nom' => strtoupper(trim($validated['nom'])),
            'prenom' => ucfirst(trim($validated['prenom'])),
            'sexe' => $validated['sexe'],
            'date_naissance' => $dateNaissance->format('Y-m-d'),
            'age' => $age,
            'telephone' => trim($validated['telephone']),
            'email' => $validated['email'] ?? null,
            'adresse' => $validated['adresse'] ?? null,
            'ville' => $validated['ville'] ?? 'Cotonou',
            'groupe_sanguin' => $validated['groupe_sanguin'] ?? null,
            'poids_kg' => $validated['poids_kg'] ?? null,
            'taille_cm' => $validated['taille_cm'] ?? null,
            'est_enceinte' => $validated['est_enceinte'] ?? false,
            'est_allaitante' => $validated['est_allaitante'] ?? false,
            'pathologies_chroniques' => $validated['pathologies_chroniques'] ?? [],
            'allergies_declarees' => $validated['allergies_declarees'] ?? [],
            'notes_cliniques' => $validated['notes_cliniques'] ?? null,
            'consentement_dp' => $validated['consentement_dp'] ?? true,
            'actif' => true,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Dossier pharmaceutique créé avec succès.',
            'data' => $patient,
        ], 201);
    }

    /**
     * Consultation détaillée d'un dossier patient
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $officineId = $this->getOfficineId($request);

        $patient = Patient::where('officine_id', $officineId)
            ->where('id', $id)
            ->with([
                'ordonnances' => fn ($q) => $q->orderByDesc('date_prescription'),
                'dispensations.lignes.produit',
                'dispensations.dispensateur',
            ])
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => $patient,
        ]);
    }

    /**
     * Mise à jour d'un dossier patient
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $officineId = $this->getOfficineId($request);

        $patient = Patient::where('officine_id', $officineId)
            ->where('id', $id)
            ->firstOrFail();

        $validated = $request->validate([
            'nom' => 'sometimes|required|string|max:100',
            'prenom' => 'sometimes|required|string|max:100',
            'sexe' => 'sometimes|required|in:M,F',
            'date_naissance' => 'sometimes|required|date|before:tomorrow',
            'telephone' => 'sometimes|required|string|max:50',
            'email' => 'nullable|email|max:150',
            'adresse' => 'nullable|string|max:255',
            'ville' => 'nullable|string|max:100',
            'groupe_sanguin' => 'nullable|string|max:10',
            'poids_kg' => 'nullable|numeric|min:0.5|max:300',
            'taille_cm' => 'nullable|numeric|min:20|max:250',
            'est_enceinte' => 'nullable|boolean',
            'est_allaitante' => 'nullable|boolean',
            'pathologies_chroniques' => 'nullable|array',
            'allergies_declarees' => 'nullable|array',
            'notes_cliniques' => 'nullable|string',
            'consentement_dp' => 'nullable|boolean',
            'actif' => 'nullable|boolean',
        ]);

        if (isset($validated['date_naissance'])) {
            $validated['age'] = Carbon::parse($validated['date_naissance'])->age;
        }

        if (isset($validated['nom'])) {
            $validated['nom'] = strtoupper(trim($validated['nom']));
        }
        if (isset($validated['prenom'])) {
            $validated['prenom'] = ucfirst(trim($validated['prenom']));
        }

        $patient->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Dossier pharmaceutique mis à jour.',
            'data' => $patient,
        ]);
    }

    /**
     * Historique thérapeutique unifié pour l'analyse pharmaceutique
     */
    public function historiqueTherapeutique(Request $request, string $id): JsonResponse
    {
        $officineId = $this->getOfficineId($request);

        $patient = Patient::where('officine_id', $officineId)
            ->where('id', $id)
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'patient' => [
                'id' => $patient->id,
                'code_patient' => $patient->code_patient,
                'nom_complet' => "{$patient->nom} {$patient->prenom}",
                'allergies_declarees' => $patient->allergies_declarees,
                'pathologies_chroniques' => $patient->pathologies_chroniques,
                'est_enceinte' => $patient->est_enceinte,
                'est_allaitante' => $patient->est_allaitante,
            ],
            'historique' => $patient->historiqueTherapeutique(),
        ]);
    }

    /**
     * Analyse clinique en direct des interactions / contre-indications
     */
    public function verifierInteractions(Request $request, string $id): JsonResponse
    {
        $officineId = $this->getOfficineId($request);

        $patient = Patient::where('officine_id', $officineId)
            ->where('id', $id)
            ->firstOrFail();

        $request->validate([
            'produits' => 'required|array|min:1',
            'produits.*.produit_id' => 'required|uuid|exists:produits,id',
            'produits.*.quantite' => 'nullable|integer|min:1',
        ]);

        $alertes = $this->securiteClinique->analyserRisques(
            $patient,
            $request->input('produits')
        );

        return response()->json([
            'status' => 'success',
            'nb_alertes' => count($alertes),
            'a_bloquant' => collect($alertes)->contains('severite', 'critique'),
            'alertes' => $alertes,
        ]);
    }
}

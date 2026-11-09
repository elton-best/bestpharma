<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ordonnance;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class OrdonnanceController extends Controller
{
    protected function getOfficineId(Request $request): string
    {
        $user = $request->user();
        return $request->header('X-Officine-Id')
            ?? $user->officine_id
            ?? $user->officines()->wherePivot('actif', true)->value('officines.id')
            ?? abort(400, "Aucune officine active n'est rattachée à cet utilisateur.");
    }

    /**
     * Liste des ordonnances de l'officine
     */
    public function index(Request $request): JsonResponse
    {
        $officineId = $this->getOfficineId($request);

        $query = Ordonnance::where('officine_id', $officineId)
            ->with(['patient', 'prescripteur', 'dispensations']);

        if ($patientId = $request->input('patient_id')) {
            $query->where('patient_id', $patientId);
        }

        if ($statut = $request->input('statut')) {
            $query->where('statut', $statut);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('numero_ordonnance', 'ilike', "%{$search}%")
                    ->orWhere('prescripteur_nom_libre', 'ilike', "%{$search}%")
                    ->orWhereHas('patient', function ($qp) use ($search) {
                        $qp->where('nom', 'ilike', "%{$search}%")
                            ->orWhere('prenom', 'ilike', "%{$search}%")
                            ->orWhere('code_patient', 'ilike', "%{$search}%");
                    });
            });
        }

        $ordonnances = $query->orderByDesc('date_prescription')
            ->paginate($request->integer('per_page', 20));

        return response()->json([
            'status' => 'success',
            'data' => $ordonnances,
        ]);
    }

    /**
     * Enregistrement d'une ordonnance médicale
     */
    public function store(Request $request): JsonResponse
    {
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'patient_id' => 'required|uuid|exists:patients,id',
            'prescripteur_id' => 'nullable|uuid|exists:prescripteurs,id',
            'prescripteur_nom_libre' => 'nullable|string|max:150',
            'prescripteur_centre_libre' => 'nullable|string|max:150',
            'date_prescription' => 'required|date|before_or_equal:today',
            'date_expiration' => 'nullable|date',
            'duree_traitement_jours' => 'nullable|integer|min:1|max:365',
            'nombre_renouvellements_autorises' => 'nullable|integer|min:0|max:12',
            'diagnostic_presume' => 'nullable|string',
            'lignes_prescrites' => 'nullable|array',
            'commentaires_pharmacien' => 'nullable|string',
        ]);

        // Vérification de l'isolation du patient
        $patient = Patient::where('officine_id', $officineId)
            ->where('id', $validated['patient_id'])
            ->firstOrFail();

        $annee = Carbon::now()->year;
        $count = Ordonnance::where('officine_id', $officineId)->count() + 1;
        $numeroOrdonnance = sprintf('ORD-%d-%04d', $annee, $count);

        $datePrescription = Carbon::parse($validated['date_prescription']);
        // Par défaut, validité de 3 mois selon les BPD ABMed si non spécifiée
        $dateExpiration = isset($validated['date_expiration'])
            ? Carbon::parse($validated['date_expiration'])
            : $datePrescription->copy()->addMonths(3);

        $ordonnance = Ordonnance::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $officineId,
            'numero_ordonnance' => $numeroOrdonnance,
            'patient_id' => $patient->id,
            'prescripteur_id' => $validated['prescripteur_id'] ?? null,
            'prescripteur_nom_libre' => $validated['prescripteur_nom_libre'] ?? null,
            'prescripteur_centre_libre' => $validated['prescripteur_centre_libre'] ?? null,
            'date_prescription' => $datePrescription->format('Y-m-d'),
            'date_expiration' => $dateExpiration->format('Y-m-d'),
            'duree_traitement_jours' => $validated['duree_traitement_jours'] ?? 30,
            'nombre_renouvellements_autorises' => $validated['nombre_renouvellements_autorises'] ?? 0,
            'nombre_renouvellements_effectues' => 0,
            'statut' => 'active',
            'diagnostic_presume' => $validated['diagnostic_presume'] ?? null,
            'lignes_prescrites' => $validated['lignes_prescrites'] ?? [],
            'commentaires_pharmacien' => $validated['commentaires_pharmacien'] ?? null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Ordonnance enregistrée avec succès.',
            'data' => $ordonnance->load(['patient', 'prescripteur']),
        ], 201);
    }

    /**
     * Consultation détaillée de l'ordonnance et contrôle de validité
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $officineId = $this->getOfficineId($request);

        $ordonnance = Ordonnance::where('officine_id', $officineId)
            ->where('id', $id)
            ->with(['patient', 'prescripteur', 'dispensations.lignes.produit'])
            ->firstOrFail();

        $eligibilite = $ordonnance->peutEtreRenouvelee();

        return response()->json([
            'status' => 'success',
            'data' => $ordonnance,
            'eligibilite_renouvellement' => $eligibilite,
        ]);
    }

    /**
     * Téléversement et scellement cryptographique du scan de l'ordonnance (BPD-C03 / Art. 7.15)
     */
    public function televerserScan(Request $request, string $id): JsonResponse
    {
        $officineId = $this->getOfficineId($request);

        $ordonnance = Ordonnance::where('officine_id', $officineId)
            ->where('id', $id)
            ->firstOrFail();

        $request->validate([
            'fichier' => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:10240', // Max 10 Mo
        ]);

        $file = $request->file('fichier');
        $sha256 = hash_file('sha256', $file->getRealPath());

        $path = $file->store("ordonnances/{$officineId}", 'local');

        $ordonnance->update([
            'scan_ordonnance_path' => $path,
            'scan_sha256' => $sha256,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Scan de l\'ordonnance numérisé et archivé avec empreinte cryptographique SHA-256.',
            'data' => [
                'scan_ordonnance_path' => $path,
                'scan_sha256' => $sha256,
            ],
        ]);
    }

    /**
     * Enregistrement d'un renouvellement sur l'ordonnance (Art. 7.18)
     */
    public function renouveler(Request $request, string $id): JsonResponse
    {
        $officineId = $this->getOfficineId($request);

        $ordonnance = Ordonnance::where('officine_id', $officineId)
            ->where('id', $id)
            ->firstOrFail();

        $eligibilite = $ordonnance->peutEtreRenouvelee();
        if (! $eligibilite['eligible']) {
            return response()->json([
                'status' => 'error',
                'message' => $eligibilite['motif'],
            ], 422);
        }

        $ordonnance->increment('nombre_renouvellements_effectues');

        // Si le quota est atteint, marquer comme clôturée
        if ($ordonnance->nombre_renouvellements_effectues >= $ordonnance->nombre_renouvellements_autorises) {
            $ordonnance->update(['statut' => 'cloturee']);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Renouvellement validé ({$ordonnance->nombre_renouvellements_effectues}/{$ordonnance->nombre_renouvellements_autorises}).",
            'data' => $ordonnance->fresh(['patient', 'prescripteur']),
        ]);
    }

    /**
     * Clôture ou refus explicite de l'ordonnance
     */
    public function cloturer(Request $request, string $id): JsonResponse
    {
        $officineId = $this->getOfficineId($request);

        $ordonnance = Ordonnance::where('officine_id', $officineId)
            ->where('id', $id)
            ->firstOrFail();

        $request->validate([
            'statut' => 'required|in:cloturee,refusee',
            'motif' => 'nullable|string|max:255',
        ]);

        $ordonnance->update([
            'statut' => $request->input('statut'),
            'commentaires_pharmacien' => $request->input('motif')
                ? "{$ordonnance->commentaires_pharmacien} [Clôture: {$request->input('motif')}]"
                : $ordonnance->commentaires_pharmacien,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Ordonnance mise à jour au statut {$ordonnance->statut}.",
            'data' => $ordonnance,
        ]);
    }
}

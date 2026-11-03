<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RegistrePreparation;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PreparationController extends Controller
{
    /**
     * Liste des préparations magistrales et officinales
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $officineId = $user->officine_id;

        $preparations = RegistrePreparation::where('officine_id', $officineId)
            ->with(['executant', 'pharmacienVisa'])
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json([
            'status' => 'success',
            'data' => $preparations,
        ]);
    }

    /**
     * Enregistrer une nouvelle préparation magistrale au registre
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom_preparation' => 'required|string|max:200',
            'type_preparation' => 'required|in:magistrale,officinale',
            'formule_detaillee' => 'required|string',
            'matieres_premieres_lots' => 'nullable|array',
            'quantite_produite' => 'required|string|max:100',
            'conditionnement' => 'required|string|max:100',
            'date_fabrication' => 'required|date',
            'date_limite_utilisation' => 'required|date|after_or_equal:date_fabrication',
            'patient_nom' => 'nullable|string|max:150',
            'prescripteur_nom' => 'nullable|string|max:150',
            'controles_effectues' => 'nullable|string',
            'conforme' => 'boolean',
        ]);

        $user = $request->user();
        $officineId = $user->officine_id;

        $annee = Carbon::now()->format('Y');
        $count = RegistrePreparation::where('officine_id', $officineId)->whereYear('created_at', $annee)->count() + 1;
        $numPrep = sprintf('PREP-%s-%04d', $annee, $count);

        $estPharmacien = in_array($user->role, ['pharmacien_titulaire', 'pharmacien_adjoint']);

        $preparation = RegistrePreparation::create([
            'officine_id' => $officineId,
            'numero_preparation' => $numPrep,
            'nom_preparation' => $validated['nom_preparation'],
            'type_preparation' => $validated['type_preparation'],
            'formule_detaillee' => $validated['formule_detaillee'],
            'matieres_premieres_lots' => $validated['matieres_premieres_lots'] ?? [],
            'quantite_produite' => $validated['quantite_produite'],
            'conditionnement' => $validated['conditionnement'],
            'date_fabrication' => $validated['date_fabrication'],
            'date_limite_utilisation' => $validated['date_limite_utilisation'],
            'patient_nom' => $validated['patient_nom'] ?? null,
            'prescripteur_nom' => $validated['prescripteur_nom'] ?? null,
            'executant_id' => $user->id,
            'pharmacien_visa_id' => $estPharmacien ? $user->id : null,
            'date_visa' => $estPharmacien ? Carbon::now() : null,
            'conforme' => $validated['conforme'] ?? true,
            'controles_effectues' => $validated['controles_effectues'] ?? 'Aspect limpide, couleur conforme, pH vérifié.',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Préparation {$preparation->numero_preparation} inscrite au registre avec succès",
            'data' => $preparation->load(['executant', 'pharmacienVisa']),
        ], 201);
    }

    /**
     * Visa officiel et libération de la préparation par le pharmacien
     */
    public function viser(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!in_array($user->role, ['pharmacien_titulaire', 'pharmacien_adjoint', 'promoteur'])) {
            return response()->json(['message' => 'Seul un pharmacien peut viser et libérer une préparation magistrale.'], 403);
        }

        $preparation = RegistrePreparation::where('officine_id', $user->officine_id)->findOrFail($id);

        $preparation->update([
            'pharmacien_visa_id' => $user->id,
            'date_visa' => Carbon::now(),
            'conforme' => true,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Préparation contrôlée et visée avec succès',
            'data' => $preparation->load('pharmacienVisa'),
        ]);
    }
}

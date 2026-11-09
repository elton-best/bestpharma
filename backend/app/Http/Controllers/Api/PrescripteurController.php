<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Prescripteur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PrescripteurController extends Controller
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
     * Liste et recherche des prescripteurs
     */
    public function index(Request $request): JsonResponse
    {
        $officineId = $this->getOfficineId($request);

        $query = Prescripteur::where(function ($q) use ($officineId) {
            $q->where('officine_id', $officineId)
                ->orWhereNull('officine_id'); // Prescripteurs du répertoire national/partagé
        })->where('actif', true);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('nom_complet', 'ilike', "%{$search}%")
                    ->orWhere('centre_sante', 'ilike', "%{$search}%")
                    ->orWhere('numero_ordre', 'ilike', "%{$search}%")
                    ->orWhere('specialite', 'ilike', "%{$search}%");
            });
        }

        $prescripteurs = $query->orderBy('nom_complet')->get();

        return response()->json([
            'status' => 'success',
            'data' => $prescripteurs,
        ]);
    }

    /**
     * Enregistrement d'un prescripteur
     */
    public function store(Request $request): JsonResponse
    {
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'nom_complet' => 'required|string|max:150',
            'titre' => 'nullable|string|max:50',
            'specialite' => 'nullable|string|max:100',
            'numero_ordre' => 'nullable|string|max:50',
            'centre_sante' => 'nullable|string|max:150',
            'telephone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:150',
            'ville' => 'nullable|string|max:100',
        ]);

        $prescripteur = Prescripteur::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $officineId,
            'nom_complet' => trim($validated['nom_complet']),
            'titre' => $validated['titre'] ?? 'Dr',
            'specialite' => $validated['specialite'] ?? null,
            'numero_ordre' => $validated['numero_ordre'] ?? null,
            'centre_sante' => $validated['centre_sante'] ?? null,
            'telephone' => $validated['telephone'] ?? null,
            'email' => $validated['email'] ?? null,
            'ville' => $validated['ville'] ?? 'Cotonou',
            'actif' => true,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Prescripteur enregistré avec succès.',
            'data' => $prescripteur,
        ], 201);
    }
}

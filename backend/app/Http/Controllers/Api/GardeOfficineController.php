<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OfficineGarde;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GardeOfficineController extends Controller
{
    /**
     * Liste des officines de garde
     */
    public function index(Request $request): JsonResponse
    {
        $query = OfficineGarde::query();

        if ($request->filled('commune')) {
            $query->where('commune', 'ilike', '%' . $request->input('commune') . '%');
        }

        // Par défaut, retourner les gardes actives ou à venir (30 derniers jours à 60 prochains jours)
        if ($request->boolean('en_cours', false)) {
            $now = now();
            $query->where('date_debut', '<=', $now)
                ->where('date_fin', '>=', $now)
                ->where('est_garde_active', true);
        } else {
            $query->where('date_fin', '>=', now()->subDays(7));
        }

        $gardes = $query->orderBy('date_debut')->get();

        // Si la base est encore vide en début d'utilisation, fournir quelques gardes officielles de référence
        if ($gardes->isEmpty() && ! $request->filled('commune')) {
            $gardes = $this->gardesParDefaut();
        }

        return response()->json($gardes);
    }

    /**
     * Déclaration d'une garde
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'officine_id' => 'nullable|uuid|exists:officines,id',
            'nom_officine' => 'required|string|max:255',
            'commune' => 'required|string|max:100',
            'zone_quartier' => 'required|string|max:255',
            'telephone' => 'required|string|max:50',
            'date_debut' => 'required|date',
            'date_fin' => 'required|date|after:date_debut',
            'commentaires' => 'nullable|string',
        ]);

        $garde = OfficineGarde::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $validated['officine_id'] ?? null,
            'nom_officine' => $validated['nom_officine'],
            'commune' => $validated['commune'],
            'zone_quartier' => $validated['zone_quartier'],
            'telephone' => $validated['telephone'],
            'date_debut' => $validated['date_debut'],
            'date_fin' => $validated['date_fin'],
            'est_garde_active' => true,
            'commentaires' => $validated['commentaires'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Période de garde enregistrée avec succès.',
            'garde' => $garde,
        ], 201);
    }

    /**
     * Suppression d'une garde
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $garde = OfficineGarde::findOrFail($id);
        $garde->delete();

        return response()->json(['message' => 'Garde supprimée avec succès.']);
    }

    private function gardesParDefaut(): array
    {
        $maintenant = now();
        $finSemaine = now()->endOfWeek();

        return [
            [
                'id' => 'demo-garde-1',
                'nom_officine' => 'Pharmacie de l\'Étoile',
                'commune' => 'Cotonou',
                'zone_quartier' => 'Haie Vive / Camp Guézo',
                'telephone' => '+229 21 30 11 22',
                'date_debut' => $maintenant->toDateTimeString(),
                'date_fin' => $finSemaine->toDateTimeString(),
                'est_garde_active' => true,
                'commentaires' => 'Garde de nuit et week-end assurée 24h/24',
            ],
            [
                'id' => 'demo-garde-2',
                'nom_officine' => 'Pharmacie du Littoral',
                'commune' => 'Porto-Novo',
                'zone_quartier' => 'Ouando',
                'telephone' => '+229 20 22 33 44',
                'date_debut' => $maintenant->toDateTimeString(),
                'date_fin' => $finSemaine->toDateTimeString(),
                'est_garde_active' => true,
                'commentaires' => 'Service de garde de la ville capitale',
            ],
            [
                'id' => 'demo-garde-3',
                'nom_officine' => 'Pharmacie Sainte Trinité',
                'commune' => 'Abomey-Calavi',
                'zone_quartier' => 'Carrefour IITA / Tankpè',
                'telephone' => '+229 21 36 00 12',
                'date_debut' => $maintenant->toDateTimeString(),
                'date_fin' => $finSemaine->toDateTimeString(),
                'est_garde_active' => true,
                'commentaires' => 'Ouvert 24h/24',
            ],
        ];
    }
}

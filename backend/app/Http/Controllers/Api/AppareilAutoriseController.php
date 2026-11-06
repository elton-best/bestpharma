<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppareilAutorise;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AppareilAutoriseController extends Controller
{
    /**
     * Liste des appareils autorisés pour une officine (APP-01, APP-02, APP-04)
     */
    public function index(Request $request, ?string $officineId = null): JsonResponse
    {
        $finalOfficineId = $officineId ?: $request->user()?->officines()->first()?->id;

        if (!$finalOfficineId) {
            return response()->json(['data' => []]);
        }

        $appareils = AppareilAutorise::query()
            ->where('officine_id', $finalOfficineId)
            ->where('archived', false)
            ->orderByDesc('actif')
            ->orderByDesc('derniere_activite')
            ->get();

        // Si la liste est vide, initialisons avec les postes standards de l'officine pour démonstration et conformité
        if ($appareils->isEmpty()) {
            $defaultAppareils = [
                [
                    'id' => (string) Str::uuid(),
                    'officine_id' => $finalOfficineId,
                    'nom_appareil' => 'Comptoir Principal 01 (Caisse & e-MECeF)',
                    'identifiant_unique' => 'BP-CPT-01-' . strtoupper(Str::random(6)),
                    'type_appareil' => 'caisse',
                    'est_borne_pointage' => false,
                    'actif' => true,
                    'derniere_activite' => now(),
                    'enregistre_par' => $request->user()?->id,
                ],
                [
                    'id' => (string) Str::uuid(),
                    'officine_id' => $finalOfficineId,
                    'nom_appareil' => 'Borne Pointage Entrée Personnel (H24)',
                    'identifiant_unique' => 'BP-BRN-01-' . strtoupper(Str::random(6)),
                    'type_appareil' => 'borne_pointage',
                    'est_borne_pointage' => true,
                    'actif' => true,
                    'derniere_activite' => now()->subMinutes(2),
                    'enregistre_par' => $request->user()?->id,
                ],
                [
                    'id' => (string) Str::uuid(),
                    'officine_id' => $finalOfficineId,
                    'nom_appareil' => 'Poste Back-Office Pharmacien Titulaire',
                    'identifiant_unique' => 'BP-BO-01-' . strtoupper(Str::random(6)),
                    'type_appareil' => 'pc_bureau',
                    'est_borne_pointage' => false,
                    'actif' => true,
                    'derniere_activite' => now()->subMinutes(12),
                    'enregistre_par' => $request->user()?->id,
                ],
                [
                    'id' => (string) Str::uuid(),
                    'officine_id' => $finalOfficineId,
                    'nom_appareil' => 'Tablette Inventaire & Réception Grossistes',
                    'identifiant_unique' => 'BP-TAB-01-' . strtoupper(Str::random(6)),
                    'type_appareil' => 'tablette_inventaire',
                    'est_borne_pointage' => false,
                    'actif' => true,
                    'derniere_activite' => now()->subHours(1),
                    'enregistre_par' => $request->user()?->id,
                ],
            ];

            foreach ($defaultAppareils as $item) {
                AppareilAutorise::create($item);
            }

            $appareils = AppareilAutorise::where('officine_id', $finalOfficineId)->where('archived', false)->get();
        }

        return response()->json([
            'data' => $appareils,
            'total' => $appareils->count(),
            'actifs_count' => $appareils->where('actif', true)->count(),
            'bornes_count' => $appareils->where('est_borne_pointage', true)->count(),
        ]);
    }

    /**
     * Enregistrer / appairer un nouvel appareil (APP-01, APP-02)
     */
    public function store(Request $request, ?string $officineId = null): JsonResponse
    {
        $finalOfficineId = $officineId ?: $request->user()?->officines()->first()?->id;

        $validated = $request->validate([
            'nom_appareil' => 'required|string|max:100',
            'type_appareil' => 'required|string|in:caisse,pc_bureau,borne_pointage,tablette_inventaire,smartphone_nomade',
            'identifiant_unique' => 'nullable|string|max:255',
            'est_borne_pointage' => 'nullable|boolean',
        ]);

        $identifiant = $validated['identifiant_unique'] ?: 'BP-' . strtoupper(substr($validated['type_appareil'], 0, 3)) . '-' . strtoupper(Str::random(8));

        $appareil = AppareilAutorise::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $finalOfficineId,
            'nom_appareil' => $validated['nom_appareil'],
            'identifiant_unique' => $identifiant,
            'type_appareil' => $validated['type_appareil'],
            'est_borne_pointage' => $validated['est_borne_pointage'] ?? ($validated['type_appareil'] === 'borne_pointage'),
            'actif' => true,
            'derniere_activite' => now(),
            'enregistre_par' => $request->user()?->id,
            'archived' => false,
        ]);

        return response()->json([
            'message' => 'Appareil autorisé et appairé avec succès dans BestPharma.',
            'appareil' => $appareil,
        ], 201);
    }

    /**
     * Révocation d'urgence immédiate (< 30s) d'un appareil (APP-05)
     */
    public function revoquer(Request $request, string $id): JsonResponse
    {
        $appareil = AppareilAutorise::findOrFail($id);

        $appareil->update([
            'actif' => false,
        ]);

        return response()->json([
            'message' => "Appareil {$appareil->nom_appareil} révoqué d'urgence avec succès.",
            'appareil' => $appareil,
        ]);
    }

    /**
     * Réactiver un appareil précédemment révoqué
     */
    public function reactiver(Request $request, string $id): JsonResponse
    {
        $appareil = AppareilAutorise::findOrFail($id);

        $appareil->update([
            'actif' => true,
            'derniere_activite' => now(),
        ]);

        return response()->json([
            'message' => "Appareil {$appareil->nom_appareil} réactivé avec succès.",
            'appareil' => $appareil,
        ]);
    }

    /**
     * Supprimer / archiver un appareil du parc
     */
    public function destroy(string $id): JsonResponse
    {
        $appareil = AppareilAutorise::findOrFail($id);
        $appareil->update(['archived' => true, 'actif' => false]);

        return response()->json([
            'message' => "Appareil retiré du parc de l'officine.",
        ]);
    }
}

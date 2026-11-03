<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Officine;
use App\Models\OfficineParametre;
use App\Models\UtilisateurOfficine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OfficineController extends Controller
{
    /**
     * Liste des officines rattachées à l'utilisateur
     */
    public function index(Request $request): JsonResponse
    {
        $officines = $request->user()
            ->officines()
            ->where('officines.archived', false)
            ->wherePivot('actif', true)
            ->wherePivot('archived', false)
            ->get();

        return response()->json($officines);
    }

    /**
     * Affichage d'une officine
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $officine = Officine::where('id', $id)
            ->where('archived', false)
            ->firstOrFail();

        return response()->json($officine);
    }

    /**
     * Création d'une nouvelle officine
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'raison_sociale' => 'required|string|max:255',
            'numero_licence' => 'required|string|max:100|unique:officines,numero_licence',
            'date_licence' => 'nullable|date',
            'adresse' => 'required|string',
            'ville' => 'nullable|string|max:100',
            'telephone' => 'required|string|max:50',
            'email' => 'nullable|email|max:255',
            'regime_fiscal' => 'nullable|string|max:100',
            'fuseau' => 'nullable|string|max:50',
            'devise' => 'nullable|string|max:10',
        ]);

        $user = $request->user();

        $officine = DB::transaction(function () use ($validated, $user) {
            $officine = Officine::create(array_merge($validated, [
                'created_by' => $user->id,
            ]));

            // Rattachement automatique du créateur comme Promoteur
            UtilisateurOfficine::create([
                'officine_id' => $officine->id,
                'user_id' => $user->id,
                'role_code' => 'promoteur',
                'actif' => true,
                'archived' => false,
                'created_by' => $user->id,
            ]);

            // Injection des paramètres réglementaires initiaux de l'officine (E0-S5)
            $defaultParams = [
                ['cle' => 'fuseau_horaire', 'valeur' => ['valeur' => 'Africa/Porto-Novo'], 'type_donnee' => 'string', 'description' => 'Fuseau horaire officiel du Bénin'],
                ['cle' => 'devise', 'valeur' => ['valeur' => 'XOF'], 'type_donnee' => 'string', 'description' => 'Devise en Francs CFA sans décimale'],
                ['cle' => 'delai_inactivite_minutes', 'valeur' => ['valeur' => 15], 'type_donnee' => 'number', 'description' => 'Durée avant verrouillage automatique sur inactivité'],
                ['cle' => 'tolerance_pointage_minutes', 'valeur' => ['valeur' => 10], 'type_donnee' => 'number', 'description' => 'Tolérance de retard de pointage en minutes'],
                ['cle' => 'mode_presence_pharmacien', 'valeur' => ['valeur' => 'alerte'], 'type_donnee' => 'string', 'description' => 'Mode en cas d absence de pharmacien : alerte ou blocage'],
                ['cle' => 'conservation_registres_ans', 'valeur' => ['valeur' => 10], 'type_donnee' => 'number', 'description' => 'Durée minimale de conservation légale des registres'],
            ];

            foreach ($defaultParams as $param) {
                OfficineParametre::create([
                    'officine_id' => $officine->id,
                    'cle' => $param['cle'],
                    'valeur' => $param['valeur'],
                    'type_donnee' => $param['type_donnee'],
                    'description' => $param['description'],
                    'version' => 1,
                    'created_by' => $user->id,
                ]);
            }

            return $officine;
        });

        return response()->json($officine, 201);
    }

    /**
     * Mise à jour d'une officine
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $officine = Officine::where('id', $id)
            ->where('archived', false)
            ->firstOrFail();

        $validated = $request->validate([
            'nom' => 'sometimes|required|string|max:255',
            'raison_sociale' => 'sometimes|required|string|max:255',
            'adresse' => 'sometimes|required|string',
            'ville' => 'nullable|string|max:100',
            'telephone' => 'sometimes|required|string|max:50',
            'email' => 'nullable|email|max:255',
            'regime_fiscal' => 'nullable|string|max:100',
        ]);

        $officine->update($validated);

        return response()->json($officine);
    }
}

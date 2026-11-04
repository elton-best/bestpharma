<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PointageController extends Controller
{
    /**
     * Liste des pointages de la journée avec vérification de la présence du pharmacien (art. 1.11)
     */
    public function index(Request $request, string $officineId): JsonResponse
    {
        $today = now()->toDateString();

        $pointages = DB::table('pointages')
            ->join('employes', 'pointages.employe_id', '=', 'employes.id')
            ->where('pointages.officine_id', $officineId)
            ->whereDate('pointages.horodatage', $today)
            ->select('pointages.*', 'employes.nom_complet as employe_nom', 'employes.poste as employe_poste')
            ->orderByDesc('pointages.horodatage')
            ->get();

        // Vérification de la présence d'au moins un pharmacien (Titulaire ou Adjoint)
        $presencePharmacien = $this->verifierPresencePharmacien($officineId);

        return response()->json([
            'pointages' => $pointages,
            'pharmacien_present' => $presencePharmacien['present'],
            'pharmaciens_sur_place' => $presencePharmacien['pharmaciens'],
            'statut_reglementaire' => $presencePharmacien['present'] ? 'CONFORME_BPD' : 'ALERTE_ABSENCE_PHARMACIEN',
            'message' => $presencePharmacien['present']
                ? 'Présence pharmaceutique continue assurée (art. 1.11 BPD).'
                : 'Attention : aucun pharmacien n\'est actuellement pointé présent sur place !',
        ]);
    }

    /**
     * Enregistrement d'un pointage (arrivée ou départ)
     */
    public function store(Request $request, string $officineId): JsonResponse
    {
        $validated = $request->validate([
            'employe_id' => 'required|uuid',
            'type' => 'required|in:arrivee,depart',
        ]);

        $employe = DB::table('employes')
            ->where('officine_id', $officineId)
            ->where('id', $validated['employe_id'])
            ->first();

        if (! $employe) {
            return response()->json(['message' => 'Employé non trouvé'], 404);
        }

        $id = (string) Str::uuid();
        DB::table('pointages')->insert([
            'id' => $id,
            'officine_id' => $officineId,
            'employe_id' => $validated['employe_id'],
            'type' => $validated['type'],
            'horodatage' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $presencePharmacien = $this->verifierPresencePharmacien($officineId);

        return response()->json([
            'message' => 'Pointage enregistré avec succès.',
            'pointage_id' => $id,
            'pharmacien_present' => $presencePharmacien['present'],
        ], 201);
    }

    /**
     * Statut de pointage actif et présence en temps réel
     */
    public function actif(Request $request, string $officineId): JsonResponse
    {
        $today = now()->toDateString();
        $presencePharmacien = $this->verifierPresencePharmacien($officineId);

        $pointagesActifs = DB::table('pointages')
            ->join('employes', 'pointages.employe_id', '=', 'employes.id')
            ->where('pointages.officine_id', $officineId)
            ->whereDate('pointages.horodatage', $today)
            ->where('pointages.type', 'arrivee')
            ->select('pointages.*', 'employes.nom_complet as employe_nom', 'employes.poste as employe_poste')
            ->get();

        return response()->json([
            'pharmacien_present' => $presencePharmacien['present'],
            'pharmaciens_sur_place' => $presencePharmacien['pharmaciens'],
            'presence' => [
                'pharmacien_present' => $presencePharmacien['present'],
                'pharmaciens' => $presencePharmacien['pharmaciens'],
            ],
            'pointages_actifs' => $pointagesActifs,
        ]);
    }

    /**
     * Pointage rapide de prise de service / arrivée de l'utilisateur connecté ou du poste
     */
    public function prise(Request $request, string $officineId): JsonResponse
    {
        $user = $request->user();
        $poste = $request->input('poste', 'pharmacien_titulaire');

        // Chercher ou créer l'employé correspondant à l'utilisateur ou au poste
        $employe = null;
        if ($user && !empty($user->name)) {
            // Recherche par nom
            $employe = DB::table('employes')
                ->where('officine_id', $officineId)
                ->where('nom_complet', 'like', '%' . explode(' ', trim($user->name))[0] . '%')
                ->first();
        }

        if (! $employe) {
            // Prendre le premier employé correspondant au poste
            $employe = DB::table('employes')
                ->where('officine_id', $officineId)
                ->where('poste', $poste)
                ->first();
        }

        if (! $employe) {
            // Créer un employé automatique pour l'utilisateur
            $empId = (string) Str::uuid();
            $nom = $user ? $user->name : ($poste === 'pharmacien_titulaire' ? 'Dr Pharmacien Titulaire' : 'Collaborateur Officine');
            DB::table('employes')->insert([
                'id' => $empId,
                'officine_id' => $officineId,
                'nom_complet' => $nom,
                'poste' => $poste,
                'actif' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $employeId = $empId;
        } else {
            $employeId = $employe->id;
        }

        $pointageId = (string) Str::uuid();
        DB::table('pointages')->insert([
            'id' => $pointageId,
            'officine_id' => $officineId,
            'employe_id' => $employeId,
            'type' => 'arrivee',
            'horodatage' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $presencePharmacien = $this->verifierPresencePharmacien($officineId);

        return response()->json([
            'message' => 'Prise de service pointée avec succès (art. 1.11 BPD).',
            'pointage_id' => $pointageId,
            'pharmacien_present' => $presencePharmacien['present'],
            'pharmaciens_sur_place' => $presencePharmacien['pharmaciens'],
        ], 201);
    }

    private function verifierPresencePharmacien(string $officineId): array
    {
        $today = now()->toDateString();

        // Récupérer les employés pharmaciens
        $pharmaciens = DB::table('employes')
            ->where('officine_id', $officineId)
            ->whereIn('poste', ['pharmacien_titulaire', 'pharmacien_adjoint', 'pharmacien_remplacant', 'promoteur'])
            ->pluck('nom_complet', 'id');

        $surPlace = [];

        foreach ($pharmaciens as $id => $nom) {
            $dernierPointage = DB::table('pointages')
                ->where('officine_id', $officineId)
                ->where('employe_id', $id)
                ->whereDate('horodatage', $today)
                ->orderByDesc('horodatage')
                ->first();

            if ($dernierPointage && $dernierPointage->type === 'arrivee') {
                $surPlace[] = $nom;
            }
        }

        return [
            'present' => count($surPlace) > 0,
            'pharmaciens' => $surPlace,
        ];
    }
}

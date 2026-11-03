<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EquipementOfficine;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EquipementController extends Controller
{
    public function index(Request $request, string $officineId): JsonResponse
    {
        $equipements = EquipementOfficine::where('officine_id', $officineId)
            ->orderBy('code_interne')
            ->get();

        // Si aucun équipement n'est encore initialisé, créer les équipements standards de base
        if ($equipements->isEmpty()) {
            $standards = [
                [
                    'code_interne' => 'FRIG-01',
                    'designation' => 'Réfrigérateur Médical Thermolabiles (2°C–8°C)',
                    'categorie' => 'refrigerateur',
                    'marque_modele' => 'Dometic HC302',
                    'emplacement' => 'Espace de stockage / Réserve',
                    'periodicite_etalonnage_mois' => 12,
                    'date_acquisition' => '2024-01-15',
                    'date_dernier_etalonnage' => Carbon::now()->subMonths(3)->toDateString(),
                    'date_prochain_etalonnage' => Carbon::now()->addMonths(9)->toDateString(),
                    'statut' => 'conforme',
                ],
                [
                    'code_interne' => 'CLIM-01',
                    'designation' => 'Climatiseur Central Magasin & Réserve (< 25°C)',
                    'categorie' => 'climatiseur',
                    'marque_modele' => 'Carrier 18000 BTU',
                    'emplacement' => 'Magasin central',
                    'periodicite_etalonnage_mois' => 6,
                    'date_acquisition' => '2023-06-20',
                    'date_dernier_etalonnage' => Carbon::now()->subMonths(2)->toDateString(),
                    'date_prochain_etalonnage' => Carbon::now()->addMonths(4)->toDateString(),
                    'statut' => 'conforme',
                ],
                [
                    'code_interne' => 'BAL-01',
                    'designation' => 'Balance électronique de précision préparatoire (0.01g)',
                    'categorie' => 'balance_precision',
                    'marque_modele' => 'Sartorius Practum',
                    'emplacement' => 'Préparatoire officinal',
                    'periodicite_etalonnage_mois' => 12,
                    'date_acquisition' => '2023-09-10',
                    'date_dernier_etalonnage' => Carbon::now()->subMonths(5)->toDateString(),
                    'date_prochain_etalonnage' => Carbon::now()->addMonths(7)->toDateString(),
                    'statut' => 'conforme',
                ],
                [
                    'code_interne' => 'OND-01',
                    'designation' => 'Onduleur Haute Capacité & Secours Électrique Frigo',
                    'categorie' => 'onduleur_groupe',
                    'marque_modele' => 'APC Smart-UPS 3000VA',
                    'emplacement' => 'Local technique',
                    'periodicite_etalonnage_mois' => 6,
                    'date_acquisition' => '2024-01-15',
                    'date_dernier_etalonnage' => Carbon::now()->subMonths(1)->toDateString(),
                    'date_prochain_etalonnage' => Carbon::now()->addMonths(5)->toDateString(),
                    'statut' => 'conforme',
                ],
                [
                    'code_interne' => 'THERM-01',
                    'designation' => 'Thermomètre-Enregistreur USB Calibré Chaîne du Froid',
                    'categorie' => 'enregistreur_temperature',
                    'marque_modele' => 'Testo 174T',
                    'emplacement' => 'Dans l’enceinte FRIG-01',
                    'periodicite_etalonnage_mois' => 12,
                    'date_acquisition' => '2024-02-01',
                    'date_dernier_etalonnage' => Carbon::now()->subMonths(2)->toDateString(),
                    'date_prochain_etalonnage' => Carbon::now()->addMonths(10)->toDateString(),
                    'statut' => 'conforme',
                ],
            ];

            foreach ($standards as $s) {
                EquipementOfficine::create(array_merge($s, [
                    'id' => (string) Str::uuid(),
                    'officine_id' => $officineId,
                ]));
            }

            $equipements = EquipementOfficine::where('officine_id', $officineId)->orderBy('code_interne')->get();
        }

        return response()->json($equipements);
    }

    public function store(Request $request, string $officineId): JsonResponse
    {
        $validated = $request->validate([
            'code_interne' => 'required|string|max:50',
            'designation' => 'required|string|max:255',
            'categorie' => 'required|string',
            'marque_modele' => 'nullable|string|max:255',
            'numero_serie' => 'nullable|string|max:100',
            'emplacement' => 'nullable|string|max:255',
            'date_acquisition' => 'nullable|date',
            'periodicite_etalonnage_mois' => 'nullable|integer',
            'date_dernier_etalonnage' => 'nullable|date',
            'certificat_ref' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $periodicite = $validated['periodicite_etalonnage_mois'] ?? 12;
        $dernier = $validated['date_dernier_etalonnage'] ?? null;
        $prochain = $dernier ? Carbon::parse($dernier)->addMonths($periodicite)->toDateString() : null;

        $statut = 'conforme';
        if ($prochain && Carbon::parse($prochain)->isPast()) {
            $statut = 'a_etalonner';
        }

        $eq = EquipementOfficine::create(array_merge($validated, [
            'id' => (string) Str::uuid(),
            'officine_id' => $officineId,
            'periodicite_etalonnage_mois' => $periodicite,
            'date_prochain_etalonnage' => $prochain,
            'statut' => $statut,
        ]));

        return response()->json($eq, 201);
    }
}

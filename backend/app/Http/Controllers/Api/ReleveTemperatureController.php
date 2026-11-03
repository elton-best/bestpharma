<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NonConformite;
use App\Models\ReleveTemperature;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ReleveTemperatureController extends Controller
{
    /**
     * Liste les relevés de température d'une officine.
     */
    public function index(Request $request, string $officineId): JsonResponse
    {
        $query = ReleveTemperature::where('officine_id', $officineId)
            ->with(['agent:id,name,email', 'nonConformite:id,numero_nc,titre,gravite,statut'])
            ->orderByDesc('date_releve')
            ->orderByDesc('heure_releve');

        if ($request->has('zone')) {
            $query->where('zone', $request->query('zone'));
        }

        if ($request->has('date')) {
            $query->where('date_releve', $request->query('date'));
        }

        return response()->json($query->paginate(30));
    }

    /**
     * Enregistre un relevé de température avec détection automatique d'excursion (Art. 4.18 / 5.20).
     */
    public function store(Request $request, string $officineId): JsonResponse
    {
        $validated = $request->validate([
            'zone' => 'required|string|in:refrigeree_2_8,magasin_reserve,hall_dispensation',
            'temperature' => 'required|numeric',
            'temp_min' => 'nullable|numeric',
            'temp_max' => 'nullable|numeric',
            'humidite' => 'nullable|numeric',
            'moment' => 'required|string|in:matin,soir',
            'date_releve' => 'nullable|date',
            'heure_releve' => 'nullable|date_format:H:i',
            'notes' => 'nullable|string',
        ]);

        $temp = (float) $validated['temperature'];
        $zone = $validated['zone'];
        $statut = 'conforme';

        // RÈGLES DE CONFORMITÉ BPD BÉNIN
        if ($zone === 'refrigeree_2_8') {
            if ($temp < 2.0) {
                $statut = 'excursion_basse';
            } elseif ($temp > 8.0) {
                $statut = 'excursion_haute';
            }
        } elseif ($zone === 'magasin_reserve') {
            if ($temp > 25.0) {
                $statut = 'excursion_haute';
            }
        } elseif ($zone === 'hall_dispensation') {
            if ($temp > 26.0) {
                $statut = 'excursion_haute';
            }
        }

        $now = Carbon::now('Africa/Porto-Novo');
        $dateReleve = $validated['date_releve'] ?? $now->toDateString();
        $heureReleve = $validated['heure_releve'] ?? $now->format('H:i:s');

        $ncId = null;

        // DÉCLENCHEMENT AUTOMATIQUE D'UNE FICHE NC SI EXCURSION (BPD4-F05)
        if ($statut !== 'conforme') {
            $nomZone = match ($zone) {
                'refrigeree_2_8' => 'Enceinte réfrigérée (2°C–8°C)',
                'magasin_reserve' => 'Magasin / Réserve de stockage',
                'hall_dispensation' => 'Hall public de dispensation',
                default => $zone,
            };

            $gravite = ($zone === 'refrigeree_2_8') ? 'critique' : 'majeure';
            $annee = $now->year;
            $count = NonConformite::where('officine_id', $officineId)->whereYear('created_at', $annee)->count() + 1;
            $numero = sprintf('NC-%d-%03d', $annee, $count);

            $nc = NonConformite::create([
                'id' => (string) Str::uuid(),
                'officine_id' => $officineId,
                'numero_nc' => $numero,
                'titre' => "Excursion de température {$nomZone} ({$temp}°C)",
                'description' => "Température relevée de {$temp}°C hors tolérance réglementaire pour {$nomZone}. Produits thermolabiles concernés placés sous surveillance.",
                'source' => 'excursion_temperature',
                'gravite' => $gravite,
                'statut' => 'ouverte',
                'action_immediate' => 'Mise en quarantaine et évaluation des produits thermolabiles avant toute délivrance.',
                'analyse_causes_5m' => 'Matériel: vérifier compresseur et sonde. Méthode: vérifier étanchéité.',
                'created_by' => $request->user()?->id,
            ]);

            $ncId = $nc->id;
        }

        $releve = ReleveTemperature::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $officineId,
            'zone' => $zone,
            'temperature' => $temp,
            'temp_min' => $validated['temp_min'] ?? null,
            'temp_max' => $validated['temp_max'] ?? null,
            'humidite' => $validated['humidite'] ?? null,
            'moment' => $validated['moment'],
            'date_releve' => $dateReleve,
            'heure_releve' => $heureReleve,
            'statut_conformite' => $statut,
            'agent_id' => $request->user()?->id,
            'non_conformite_id' => $ncId,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'releve' => $releve->load(['agent:id,name,email', 'nonConformite:id,numero_nc,titre,gravite,statut']),
            'alerte_excursion' => ($statut !== 'conforme'),
            'message' => ($statut !== 'conforme')
                ? "ATTENTION : Excursion de température détectée ({$temp}°C). Une fiche Non-Conformité ({$statut}) a été automatiquement ouverte."
                : "Relevé de température enregistré conforme.",
        ], 201);
    }

    /**
     * Statistiques de température du jour et des 30 derniers jours.
     */
    public function stats(Request $request, string $officineId): JsonResponse
    {
        $today = Carbon::now('Africa/Porto-Novo')->toDateString();

        $relevesJour = ReleveTemperature::where('officine_id', $officineId)
            ->where('date_releve', $today)
            ->get();

        $zones = ['refrigeree_2_8', 'magasin_reserve', 'hall_dispensation'];
        $statutZones = [];

        foreach ($zones as $z) {
            $relevesZone = $relevesJour->where('zone', $z);
            $dernier = $relevesZone->sortByDesc('heure_releve')->first();

            $statutZones[$z] = [
                'matin_fait' => $relevesZone->where('moment', 'matin')->isNotEmpty(),
                'soir_fait' => $relevesZone->where('moment', 'soir')->isNotEmpty(),
                'dernier_releve' => $dernier,
                'statut_actuel' => $dernier ? $dernier->statut_conformite : 'en_attente',
                'temp_actuelle' => $dernier ? $dernier->temperature : null,
            ];
        }

        // Taux de conformité sur les 30 derniers jours
        $dateDebut = Carbon::now('Africa/Porto-Novo')->subDays(30)->toDateString();
        $totalReleves = ReleveTemperature::where('officine_id', $officineId)
            ->where('date_releve', '>=', $dateDebut)
            ->count();

        $excursions = ReleveTemperature::where('officine_id', $officineId)
            ->where('date_releve', '>=', $dateDebut)
            ->where('statut_conformite', '!=', 'conforme')
            ->count();

        $tauxConformite = $totalReleves > 0 ? round((($totalReleves - $excursions) / $totalReleves) * 100, 1) : 100.0;

        return response()->json([
            'date' => $today,
            'zones' => $statutZones,
            'historique_30j' => [
                'total_releves' => $totalReleves,
                'total_excursions' => $excursions,
                'taux_conformite' => $tauxConformite,
            ],
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OfficineParametre;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParametreController extends Controller
{
    /**
     * Liste des paramètres d'une officine
     */
    public function index(Request $request, string $officineId): JsonResponse
    {
        $parametres = OfficineParametre::where('officine_id', $officineId)
            ->where('archived', false)
            ->orderBy('cle')
            ->get()
            ->map(fn (OfficineParametre $parametre) => $this->presenter($parametre));

        return response()->json($parametres);
    }

    /**
     * Mise à jour d'un paramètre (réservé au promoteur)
     */
    public function update(Request $request, string $officineId, string $cle): JsonResponse
    {
        $validated = $request->validate([
            'valeur' => 'required',
            'description' => 'nullable|string',
        ]);

        $param = OfficineParametre::where('officine_id', $officineId)
            ->where('cle', $cle)
            ->where('archived', false)
            ->firstOrFail();

        $valeurFormatee = is_array($validated['valeur']) ? $validated['valeur'] : ['valeur' => $validated['valeur']];

        $param->update([
            'valeur' => $valeurFormatee,
            'description' => $validated['description'] ?? $param->description,
            'version' => $param->version + 1,
        ]);

        return response()->json($this->presenter($param->fresh()));
    }

    /**
     * Met à jour plusieurs paramètres d'un coup (écran Paramètres).
     */
    public function updateLot(Request $request, string $officineId): JsonResponse
    {
        $validated = $request->validate([
            'parametres' => 'required|array|min:1',
            'parametres.*.cle' => 'required|string|max:100',
            'parametres.*.valeur' => 'required',
        ]);

        $misAJour = [];

        foreach ($validated['parametres'] as $entree) {
            $param = OfficineParametre::where('officine_id', $officineId)
                ->where('cle', $entree['cle'])
                ->where('archived', false)
                ->first();

            if (! $param) {
                continue;
            }

            $param->update([
                'valeur' => is_array($entree['valeur']) ? $entree['valeur'] : ['valeur' => $entree['valeur']],
                'version' => $param->version + 1,
            ]);

            $misAJour[] = $param;
        }

        return response()->json([
            'message' => 'Paramètres enregistrés.',
            'parametres' => array_map(fn ($p) => $this->presenter($p), $misAJour),
        ]);
    }

    /**
     * Présentation d'un paramètre : libellé et unité dérivés de la clé, pour
     * que l'écran n'affiche jamais de clé technique.
     */
    private function presenter(OfficineParametre $parametre): array
    {
        $catalogue = [
            'fuseau_horaire' => ['libelle' => 'Fuseau horaire', 'unite' => null],
            'devise' => ['libelle' => 'Devise', 'unite' => null],
            'delai_inactivite_minutes' => ['libelle' => 'Verrouillage après inactivité', 'unite' => 'minutes'],
            'tolerance_pointage_minutes' => ['libelle' => 'Tolérance de pointage', 'unite' => 'minutes'],
            'mode_presence_pharmacien' => ['libelle' => 'Absence de pharmacien', 'unite' => null],
            'conservation_registres_ans' => ['libelle' => 'Conservation des registres', 'unite' => 'ans'],
        ];

        $meta = $catalogue[$parametre->cle] ?? [
            'libelle' => ucfirst(str_replace('_', ' ', (string) $parametre->cle)),
            'unite' => null,
        ];

        $valeur = $parametre->valeur;

        return [
            'id' => $parametre->id,
            'cle' => $parametre->cle,
            'libelle' => $meta['libellé'],
            'unite' => $meta['unite'],
            'type' => match ($parametre->type_donnee) {
                'boolean', 'booleen' => 'booleen',
                'number' => 'nombre',
                'integer', 'entier' => 'entier',
                'decimal' => 'decimal',
                default => 'texte',
            },
            'type_donnee' => $parametre->type_donnee,
            'valeur' => is_array($valeur) && array_key_exists('valeur', $valeur) ? $valeur['valeur'] : $valeur,
            'description' => $parametre->description,
            'version' => $parametre->version,
            'updated_at' => optional($parametre->updated_at)->toIso8601String(),
        ];
    }
}

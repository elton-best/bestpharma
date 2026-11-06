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
            ->first();

        $valeurFormatee = is_array($validated['valeur']) ? $validated['valeur'] : ['valeur' => $validated['valeur']];

        if (! $param) {
            $param = OfficineParametre::create([
                'officine_id' => $officineId,
                'cle' => $cle,
                'type_donnee' => is_bool($validated['valeur']) ? 'boolean' : (is_numeric($validated['valeur']) ? 'number' : 'texte'),
                'valeur' => $valeurFormatee,
                'description' => $validated['description'] ?? null,
                'version' => 1,
                'archived' => false,
            ]);
        } else {
            $param->update([
                'valeur' => $valeurFormatee,
                'description' => $validated['description'] ?? $param->description,
                'version' => $param->version + 1,
            ]);
        }

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

            $valeurFormatee = is_array($entree['valeur']) ? $entree['valeur'] : ['valeur' => $entree['valeur']];

            if (! $param) {
                $param = OfficineParametre::create([
                    'officine_id' => $officineId,
                    'cle' => $entree['cle'],
                    'type_donnee' => is_bool($entree['valeur']) ? 'boolean' : (is_numeric($entree['valeur']) ? 'number' : 'texte'),
                    'valeur' => $valeurFormatee,
                    'version' => 1,
                    'archived' => false,
                ]);
            } else {
                $param->update([
                    'valeur' => $valeurFormatee,
                    'version' => $param->version + 1,
                ]);
            }

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
            'fuseau_horaire' => ['libelle' => 'Fuseau horaire officiel', 'unite' => null],
            'devise' => ['libelle' => 'Devise monétaire légale', 'unite' => null],
            'delai_inactivite_minutes' => ['libelle' => 'Verrouillage automatique après inactivité', 'unite' => 'minutes'],
            'tolerance_pointage_minutes' => ['libelle' => 'Tolérance de retard de pointage', 'unite' => 'minutes'],
            'mode_presence_pharmacien' => ['libelle' => 'Règle en cas d\'absence du pharmacien', 'unite' => null],
            'conservation_registres_ans' => ['libelle' => 'Conservation des registres de santé', 'unite' => 'ans'],
            'conservation_stupefiants_ordonnances_ans' => ['libelle' => 'Conservation copies ordonnances stupéfiants', 'unite' => 'ans'],
            'conservation_procedures_temperatures_ans' => ['libelle' => 'Conservation procédures et températures', 'unite' => 'ans'],
            'conservation_sang_ans' => ['libelle' => 'Conservation dérivés du sang (MDS)', 'unite' => 'ans'],
            'remise_max_caissier_pct' => ['libelle' => 'Remise maximale caissier', 'unite' => '%'],
            'remise_max_dispensateur_pct' => ['libelle' => 'Remise maximale dispensateur', 'unite' => '%'],
            'seuil_validation_pharmacien_fcfa' => ['libelle' => 'Seuil validation obligatoire pharmacien', 'unite' => 'FCFA'],
            'delai_alerte_reclamations_jours' => ['libelle' => 'Délai d\'alerte réclamations clients', 'unite' => 'jours'],
            'temp_frigo_min' => ['libelle' => 'Température frigo minimale', 'unite' => '°C'],
            'temp_frigo_max' => ['libelle' => 'Température frigo maximale', 'unite' => '°C'],
            'regime_fiscal' => ['libelle' => 'Régime fiscal d\'imposition', 'unite' => null],
            'emceef_environnement' => ['libelle' => 'Environnement e-MECeF DGI', 'unite' => null],
            'mfa_obligatoire_roles' => ['libelle' => 'Rôles soumis au MFA obligatoire', 'unite' => null],
        ];

        $meta = $catalogue[$parametre->cle] ?? [
            'libelle' => ucfirst(str_replace('_', ' ', (string) $parametre->cle)),
            'unite' => null,
        ];

        $valeur = $parametre->valeur;

        return [
            'id' => $parametre->id,
            'cle' => $parametre->cle,
            'libelle' => $meta['libelle'],
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

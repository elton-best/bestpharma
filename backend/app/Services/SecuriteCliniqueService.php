<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\Produit;
use Carbon\Carbon;

class SecuriteCliniqueService
{
    /**
     * Analyse les risques cliniques pour un patient et une liste de produits prescrits / demandés.
     * Conforme Guide BPD ABMed Chapitre 7 (Art. 7.1 à 7.14)
     *
     * @param Patient|null $patient
     * @param array $produitsData Liste d'items contenant ['produit_id' => ..., 'quantite' => ...]
     * @return array Liste des alertes détectées
     */
    public function analyserRisques(?Patient $patient, array $produitsData): array
    {
        $alertes = [];

        if (empty($produitsData)) {
            return $alertes;
        }

        $produitsIds = array_column($produitsData, 'produit_id');
        $produits = Produit::whereIn('id', $produitsIds)->get()->keyBy('id');

        // 1. Analyse si un patient est renseigné
        if ($patient) {
            // A. Allergies déclarées
            $allergies = (array) ($patient->allergies_declarees ?? []);
            foreach ($produitsData as $item) {
                $p = $produits->get($item['produit_id']);
                if (! $p) continue;

                $texteProduit = strtolower(($p->nom_commercial ?? '') . ' ' . ($p->dci ?? '') . ' ' . ($p->classe_therapeutique ?? ''));

                foreach ($allergies as $allergie) {
                    $allergieClean = strtolower(trim($allergie));
                    if (empty($allergieClean)) continue;

                    // Mappage de familles courantes
                    $motsClesAllergie = [$allergieClean];
                    if (str_contains($allergieClean, 'péni') || str_contains($allergieClean, 'peni')) {
                        $motsClesAllergie = array_merge($motsClesAllergie, ['amoxi', 'clavul', 'ampicilline', 'oxacilline', 'augmentin', 'penicilline', 'bétalactam']);
                    } elseif (str_contains($allergieClean, 'ains') || str_contains($allergieClean, 'aspirine')) {
                        $motsClesAllergie = array_merge($motsClesAllergie, ['ibuprof', 'diclofenac', 'ketoprof', 'acide acetylsalicylique', 'aspirine', 'naprox']);
                    } elseif (str_contains($allergieClean, 'sulfa')) {
                        $motsClesAllergie = array_merge($motsClesAllergie, ['bactrim', 'cotrimoxazole', 'sulfamethoxazole']);
                    }

                    foreach ($motsClesAllergie as $mot) {
                        if (str_contains($texteProduit, $mot)) {
                            $alertes[] = [
                                'type' => 'allergie',
                                'severite' => 'critique',
                                'produit_id' => $p->id,
                                'produit_nom' => $p->nom_commercial,
                                'titre' => "Alerte Allergie : {$allergie}",
                                'message' => "Le patient a une allergie déclarée à '{$allergie}'. Le produit {$p->nom_commercial} ({$p->dci}) présente un risque anaphylactique majeur.",
                            ];
                            break 2;
                        }
                    }
                }
            }

            // B. Contre-indications Grossesse & Allaitement
            if ($patient->est_enceinte) {
                foreach ($produitsData as $item) {
                    $p = $produits->get($item['produit_id']);
                    if (! $p) continue;

                    $texte = strtolower(($p->nom_commercial ?? '') . ' ' . ($p->dci ?? '') . ' ' . ($p->classe_therapeutique ?? ''));
                    $ains = ['ibuprof', 'diclofenac', 'ketoprof', 'aspirine', 'naprox', 'celecoxib', 'piroxicam'];

                    foreach ($ains as $mot) {
                        if (str_contains($texte, $mot)) {
                            $alertes[] = [
                                'type' => 'grossesse',
                                'severite' => 'haute',
                                'produit_id' => $p->id,
                                'produit_nom' => $p->nom_commercial,
                                'titre' => "Contre-indication Grossesse (AINS)",
                                'message' => "La patiente est déclarée enceinte. Les AINS ({$p->nom_commercial}) sont formellement contre-indiqués à partir du 6ème mois de grossesse (toxicité cardio-pulmonaire fœtale).",
                            ];
                            break;
                        }
                    }
                }
            }

            if ($patient->est_allaitante) {
                foreach ($produitsData as $item) {
                    $p = $produits->get($item['produit_id']);
                    if (! $p) continue;

                    $texte = strtolower(($p->nom_commercial ?? '') . ' ' . ($p->dci ?? ''));
                    if (str_contains($texte, 'codeine') || str_contains($texte, 'tramadol')) {
                        $alertes[] = [
                            'type' => 'allaitement',
                            'severite' => 'haute',
                            'produit_id' => $p->id,
                            'produit_nom' => $p->nom_commercial,
                            'titre' => "Vigilance Allaitement (Opioïde)",
                            'message' => "La patiente allaite. Les antalgiques opioïdes ({$p->nom_commercial}) passent dans le lait maternel avec risque de dépression respiratoire du nourrisson.",
                        ];
                    }
                }
            }

            // C. Suivi thérapeutique & Redondances récentes dans les 15 derniers jours
            $historiqueRecent = $patient->historiqueTherapeutique();
            $quinzeJoursPasse = Carbon::now()->subDays(15);

            foreach ($produitsData as $item) {
                $p = $produits->get($item['produit_id']);
                if (! $p || ! $p->dci) continue;

                foreach ($historiqueRecent as $h) {
                    $dateH = Carbon::parse($h['date_dispensation']);
                    if ($dateH->isAfter($quinzeJoursPasse)) {
                        if (strtolower(trim($h['dci'] ?? '')) === strtolower(trim($p->dci))) {
                            $alertes[] = [
                                'type' => 'redondance',
                                'severite' => 'moderee',
                                'produit_id' => $p->id,
                                'produit_nom' => $p->nom_commercial,
                                'titre' => "Délivrance récente de la même molécule",
                                'message' => "Le patient a déjà reçu {$h['nom_commercial']} (DCI: {$p->dci}) le {$dateH->format('d/m/Y')}. Vérifier le risque de surdosage ou renouvellement précoce.",
                            ];
                            break;
                        }
                    }
                }
            }
        }

        // 2. Détection de redondances au sein même du panier / de l'ordonnance
        $dcisVues = [];
        foreach ($produitsData as $item) {
            $p = $produits->get($item['produit_id']);
            if (! $p || empty($p->dci)) continue;

            $dciNormalisee = strtolower(trim($p->dci));
            if (isset($dcisVues[$dciNormalisee])) {
                $alertes[] = [
                    'type' => 'doublon_panier',
                    'severite' => 'haute',
                    'produit_id' => $p->id,
                    'produit_nom' => $p->nom_commercial,
                    'titre' => "Doublon de DCI prescrit",
                    'message' => "Deux produits prescrits partagent la même molécule active '{$p->dci}' ({$dcisVues[$dciNormalisee]} et {$p->nom_commercial}). Risque de cumul posologique.",
                ];
            } else {
                $dcisVues[$dciNormalisee] = $p->nom_commercial;
            }
        }

        return $alertes;
    }
}

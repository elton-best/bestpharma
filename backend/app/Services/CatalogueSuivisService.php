<?php

namespace App\Services;

class CatalogueSuivisService
{
    public function definition(string $type): array
    {
        $commun = [
            ['cle' => 'responsable_suivi', 'libelle' => 'Responsable du suivi', 'type' => 'text', 'obligatoire' => true],
            ['cle' => 'date_realisation', 'libelle' => 'Date de réalisation', 'type' => 'date', 'obligatoire_realise' => true],
            ['cle' => 'observations', 'libelle' => 'Observations et commentaires', 'type' => 'textarea'],
        ];
        return match ($type) {
            'formations' => [
                'type' => $type, 'titre' => 'Plan de formation et suivi des sessions',
                'aide' => 'Planifiez les sessions, consignez leur réalisation et leur bilan. Une saisie ne vaut pas émargement des participants.',
                'source' => ['reference' => 'OKPE/FOR/GRH/007', 'feuille' => 'FORMULAIRE',
                    'fichier' => 'FOR & ENR  Plan de Formation.xlsx',
                    'sha256' => 'e585f5c7bc5a7557480b060d43fd93adc7a32e46e94f003a24041c5924f7dc4f'],
                'champ_titre' => 'theme', 'champ_date' => 'date_debut_prevue',
                'champs' => array_merge([
                    ['cle' => 'theme', 'libelle' => 'Thème de la formation', 'type' => 'text', 'obligatoire' => true],
                    ['cle' => 'public_vise', 'libelle' => 'Personnel ou public concerné', 'type' => 'text', 'obligatoire' => true],
                    ['cle' => 'date_debut_prevue', 'libelle' => 'Début prévu', 'type' => 'date', 'obligatoire' => true],
                    ['cle' => 'date_fin_prevue', 'libelle' => 'Fin prévue', 'type' => 'date', 'obligatoire' => true],
                    ['cle' => 'formateur', 'libelle' => 'Formateur ou organisme', 'type' => 'text', 'obligatoire_realise' => true],
                    ['cle' => 'bilan', 'libelle' => 'Bilan de la session et suite à donner', 'type' => 'textarea', 'obligatoire_realise' => true],
                ], $commun),
            ],
            'maintenance' => [
                'type' => $type, 'titre' => 'Registre de maintenance des appareils',
                'aide' => 'Planifiez les interventions et conservez leur description et leur résultat. Ce registre ne délivre pas de certificat d’étalonnage.',
                'source' => ['reference' => 'OKPE/FOR/GEE/002', 'feuille' => 'Formulaire 1',
                    'fichier' => 'Registre de Maintenance & Tests 2026.xlsx',
                    'sha256' => '541ae5bd67ce2bada62b5f8e7c929306e6bbfe9969b61c2cff59e4a7577f7454'],
                'champ_titre' => 'nature', 'champ_date' => 'date_prevue',
                'champs' => array_merge([
                    ['cle' => 'equipement_id', 'libelle' => 'Matériel ou appareil', 'type' => 'equipement', 'obligatoire' => true],
                    ['cle' => 'nature', 'libelle' => 'Nature de l’intervention', 'type' => 'text', 'obligatoire' => true],
                    ['cle' => 'description', 'libelle' => 'Description de l’intervention', 'type' => 'textarea', 'obligatoire' => true],
                    ['cle' => 'date_prevue', 'libelle' => 'Date prévue', 'type' => 'date', 'obligatoire' => true],
                    ['cle' => 'prestataire', 'libelle' => 'Fournisseur ou prestataire', 'type' => 'text', 'obligatoire_realise' => true],
                    ['cle' => 'resultat', 'libelle' => 'Résultat et état de fonctionnement constaté', 'type' => 'textarea', 'obligatoire_realise' => true],
                    ['cle' => 'date_prochaine_intervention', 'libelle' => 'Prochaine intervention prévue', 'type' => 'date'],
                ], $commun),
            ],
            default => throw new \InvalidArgumentException('Registre documentaire inconnu.'),
        };
    }
}

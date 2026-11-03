<?php

namespace App\Services;

class ReferentielBpdService
{
    /**
     * Retourne les 10 chapitres du Guide des Bonnes Pratiques de Dispensation de l'ABMed.
     */
    public static function getChapitres(): array
    {
        return [
            ['numero' => 1, 'titre' => 'Système de management de la qualité', 'processus' => 'TAM', 'articles_count' => 31],
            ['numero' => 2, 'titre' => 'Personnel et organisation', 'processus' => 'GAR', 'articles_count' => 22],
            ['numero' => 3, 'titre' => 'Documentation et enregistrements', 'processus' => 'QAM', 'articles_count' => 25],
            ['numero' => 4, 'titre' => 'Locaux, équipements et système informatisé', 'processus' => 'GAR', 'articles_count' => 38],
            ['numero' => 5, 'titre' => 'Approvisionnement et stockage', 'processus' => 'GAC', 'articles_count' => 27],
            ['numero' => 6, 'titre' => 'Sous-traitance', 'processus' => 'TAM', 'articles_count' => 8],
            ['numero' => 7, 'titre' => 'Dispensation et conseil pharmaceutique', 'processus' => 'GAD', 'articles_count' => 42],
            ['numero' => 8, 'titre' => 'Retraits, retours et réclamations', 'processus' => 'GAD', 'articles_count' => 13],
            ['numero' => 9, 'titre' => 'Destruction des déchets pharmaceutiques', 'processus' => 'GAC', 'articles_count' => 5],
            ['numero' => 10, 'titre' => 'Auto-inspection et audit interne', 'processus' => 'QAM', 'articles_count' => 9],
        ];
    }

    /**
     * Génère la liste des articles officiels pour une campagne d'auto-évaluation.
     */
    public static function genererArticlesPourCampagne(): array
    {
        $articles = [];
        $definitions = [
            // Chapitre 1 : SMQ
            1 => [
                'titre' => 'Système de management de la qualité',
                'processus' => 'TAM',
                'items' => [
                    ['num' => '1.1', 'libelle' => 'Engagement de la direction : existence d’une politique qualité écrite et diffusée.'],
                    ['num' => '1.2', 'libelle' => 'Nomination officielle d’un Responsable du Management de la Qualité (RMQ).'],
                    ['num' => '1.3', 'libelle' => 'Revue de direction annuelle et définition des objectifs qualité mesurables.'],
                    ['num' => '1.4', 'libelle' => 'Signature de la charte déontologique par tous les collaborateurs.'],
                    ['num' => '1.6', 'libelle' => 'Conformité de la licence d’exploitation et affichage visible.'],
                    ['num' => '1.11', 'libelle' => 'Présence physique obligatoire et continue d’un pharmacien diplômé durant l’ouverture.'],
                    ['num' => '1.13', 'libelle' => 'Effectif pharmaceutique conforme aux exigences réglementaires et au volume d’activité.'],
                    ['num' => '1.14', 'libelle' => 'Participation obligatoire au tableau de garde officiel établi par l’Ordre.'],
                    ['num' => '1.25', 'libelle' => 'Gestion systématique des non-conformités et pilotage du plan d’action CAPA.'],
                    ['num' => '1.26', 'libelle' => 'Cartographie formelle des 5 macro-processus de l’officine (TAM, QAM, GAD, GAC, GAR).'],
                    ['num' => '1.27', 'libelle' => 'Procédures opérationnelles standards (SOP) formalisées et tenues à jour.'],
                ]
            ],
            // Chapitre 2 : Personnel
            2 => [
                'titre' => 'Personnel et organisation',
                'processus' => 'GAR',
                'items' => [
                    ['num' => '2.1', 'libelle' => 'Organigramme nominatif affiché et fiches de poste signées pour chaque fonction.'],
                    ['num' => '2.2', 'libelle' => 'Vérification annuelle de l’inscription à la Section B de l’Ordre pour les pharmaciens.'],
                    ['num' => '2.5', 'libelle' => 'Plan de formation continue annuel et fiches individuelles de compétences.'],
                    ['num' => '2.10', 'libelle' => 'Port obligatoire d’un badge d’identification visible précisant la qualification.'],
                    ['num' => '2.12', 'libelle' => 'Tenue professionnelle adaptée et propre (blouse blanche pour le personnel soignant).'],
                    ['num' => '2.18', 'libelle' => 'Suivi médical obligatoire et registre des visites de médecine du travail.'],
                ]
            ],
            // Chapitre 3 : Documentation
            3 => [
                'titre' => 'Documentation et enregistrements',
                'processus' => 'QAM',
                'items' => [
                    ['num' => '3.1', 'libelle' => 'Système de gestion documentaire conforme : rédaction, vérification et approbation par le Titulaire.'],
                    ['num' => '3.10', 'libelle' => 'Intégrité des enregistrements : aucune rature, horodatage certifié et signature nominative.'],
                    ['num' => '3.12', 'libelle' => 'Respect des durées légales de conservation des archives (3, 5 ou 10 ans selon le type).'],
                    ['num' => '3.18', 'libelle' => 'Codification standardisée de tous les documents officinaux (ex: QAM-PR-001).'],
                    ['num' => '3.21', 'libelle' => 'Gestion rigoureuse des versions et archivage immédiat des versions périmées.'],
                ]
            ],
            // Chapitre 4 : Locaux et équipements
            4 => [
                'titre' => 'Locaux, équipements et système informatisé',
                'processus' => 'GAR',
                'items' => [
                    ['num' => '4.1', 'libelle' => 'Locaux d’un seul tenant, salubres, adaptés et exclusivement réservés à l’usage pharmaceutique.'],
                    ['num' => '4.4', 'libelle' => 'Espace de confidentialité dédié garantissant le secret de l’entretien pharmaceutique.'],
                    ['num' => '4.7', 'libelle' => 'Sécurité des installations : extincteurs vérifiés annuellement et consignes incendie affichées.'],
                    ['num' => '4.18', 'libelle' => 'Enregistrement quotidien obligatoire des températures du magasin et du hall (15°C à 25°C).'],
                    ['num' => '4.19', 'libelle' => 'Plan formalisé de lutte contre les nuisibles (dératisation et désinsectisation régulières).'],
                    ['num' => '4.20', 'libelle' => 'Plan de bio-nettoyage avec émargement quotidien par zone et produits homologués.'],
                    ['num' => '4.23', 'libelle' => 'Inventaire exhaustif des équipements et tenue à jour des carnets de vie.'],
                    ['num' => '4.25', 'libelle' => 'Étalonnage périodique et certificat valide des balances et sondes de mesure.'],
                    ['num' => '4.32', 'libelle' => 'Sécurité informatique : contrôle des accès par mots de passe individuels et traçabilité.'],
                    ['num' => '4.35', 'libelle' => 'Sauvegardes informatiques quotidiennes externalisées avec tests périodiques de restauration.'],
                ]
            ],
            // Chapitre 5 : Approvisionnement et stockage
            5 => [
                'titre' => 'Approvisionnement et stockage',
                'processus' => 'GAC',
                'items' => [
                    ['num' => '5.1', 'libelle' => 'Approvisionnement exclusif auprès d’établissements grossistes-répartiteurs agréés par l’ABMed.'],
                    ['num' => '5.3', 'libelle' => 'Maintien permanent du stock minimal de médicaments essentiels d’urgence.'],
                    ['num' => '5.15', 'libelle' => 'Procédure de contrôle à la réception : intégrité des colis, numéros de lots et dates de péremption.'],
                    ['num' => '5.18', 'libelle' => 'Respect strict de la chaîne du froid : stockage immédiat des produits thermolabiles entre 2°C et 8°C.'],
                    ['num' => '5.20', 'libelle' => 'Relevés bi-quotidiens obligatoires de la température de l’enceinte réfrigérée avec alarme d’excursion.'],
                    ['num' => '5.22', 'libelle' => 'Application rigoureuse de la règle FEFO (First Expired, First Out) dans le rangement.'],
                    ['num' => '5.25', 'libelle' => 'Zone d’isolement séparée, identifiée et sécurisée pour les produits périmés ou non conformes.'],
                ]
            ],
            // Chapitre 6 : Sous-traitance
            6 => [
                'titre' => 'Sous-traitance',
                'processus' => 'TAM',
                'items' => [
                    ['num' => '6.1', 'libelle' => 'Contrat écrit et signé pour toute prestation externalisée (nettoyage, sécurité, maintenance, informatique).'],
                    ['num' => '6.4', 'libelle' => 'Évaluation périodique de la conformité et de la qualité des prestataires de services.'],
                ]
            ],
            // Chapitre 7 : Dispensation
            7 => [
                'titre' => 'Dispensation et conseil pharmaceutique',
                'processus' => 'GAD',
                'items' => [
                    ['num' => '7.1', 'libelle' => 'Analyse pharmaceutique systématique de l’ordonnance avant délivrance par un personnel qualifié.'],
                    ['num' => '7.8', 'libelle' => 'Délivrance de conseils d’utilisation clairs, posologie et précautions d’emploi au patient.'],
                    ['num' => '7.15', 'libelle' => 'Armoire fermée à clé pour les stupéfiants et substances vénéneuses avec accès restreint au pharmacien.'],
                    ['num' => '7.20', 'libelle' => 'Tenue rigoureuse de l’ordonnancier et du registre spécial des stupéfiants coté et paraphé.'],
                    ['num' => '7.30', 'libelle' => 'Refus de délivrance motivé et tracé en cas de contre-indication absolue ou ordonnance falsifiée.'],
                ]
            ],
            // Chapitre 8 : Retraits et réclamations
            8 => [
                'titre' => 'Retraits, retours et réclamations',
                'processus' => 'GAD',
                'items' => [
                    ['num' => '8.1', 'libelle' => 'Procédure opérationnelle de traitement immédiat des alertes et rappels de lots émis par l’ABMed.'],
                    ['num' => '8.5', 'libelle' => 'Blocage informatique et physique immédiat en quarantaine de tout lot faisant l’objet d’un rappel.'],
                    ['num' => '8.10', 'libelle' => 'Registre d’enregistrement et de traitement des réclamations clients et signalements d’effets indésirables.'],
                ]
            ],
            // Chapitre 9 : Déchets
            9 => [
                'titre' => 'Destruction des déchets pharmaceutiques',
                'processus' => 'GAC',
                'items' => [
                    ['num' => '9.1', 'libelle' => 'Stockage sécurisé des médicaments périmés et déchets dans des conteneurs étanches identifiés.'],
                    ['num' => '9.3', 'libelle' => 'Procédure formelle de destruction conforme à la réglementation environnementale avec procès-verbal.'],
                ]
            ],
            // Chapitre 10 : Auto-inspection
            10 => [
                'titre' => 'Auto-inspection et audit interne',
                'processus' => 'QAM',
                'items' => [
                    ['num' => '10.1', 'libelle' => 'Programme annuel d’auto-inspection approuvé par le Titulaire couvrant l’ensemble des chapitres BPD.'],
                    ['num' => '10.3', 'libelle' => 'Indépendance de l’auditeur vis-à-vis du processus audité pour garantir l’objectivité.'],
                    ['num' => '10.6', 'libelle' => 'Rapport d’auto-inspection écrit avec identification précise des écarts et cartographie des risques.'],
                    ['num' => '10.8', 'libelle' => 'Mise en œuvre obligatoire d’actions correctives (CAPA) pour tout écart majeur ou mineur constaté.'],
                    ['num' => '10.9', 'libelle' => 'Suivi formel de l’efficacité des actions correctives avant clôture définitive.'],
                ]
            ]
        ];

        foreach ($definitions as $chapNum => $data) {
            foreach ($data['items'] as $item) {
                $articles[] = [
                    'chapitre_numero' => $chapNum,
                    'chapitre_titre' => $data['titre'],
                    'article_numero' => $item['num'],
                    'article_libelle' => $item['libelle'],
                    'processus' => $data['processus'],
                ];
            }
        }

        return $articles;
    }
}

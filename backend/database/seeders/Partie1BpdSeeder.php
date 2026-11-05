<?php

namespace Database\Seeders;

use App\Models\Officine;
use App\Models\User;
use App\Models\UtilisateurOfficine;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class Partie1BpdSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $officineA = Officine::firstOrCreate(
            ['numero_licence' => 'BEN-OFF-2025-001'],
            [
                'id' => (string) Str::uuid(),
                'nom' => "Pharmacie de l'Étoile",
                'raison_sociale' => "Pharmacie de l'Étoile SARL",
                'date_licence' => '2025-01-15',
                'adresse' => 'Avenue Steinmetz, Cotonou',
                'ville' => 'Cotonou',
                'telephone' => '+229 21 30 00 01',
                'email' => 'contact@pharmacieetoile.bj',
                'regime_fiscal' => 'Réel simplifié',
                'fuseau' => 'Africa/Porto-Novo',
                'devise' => 'XOF',
            ]
        );

        // 1. Tous les 11 profils utilisateurs prévus par le cahier des charges
        $usersConfig = [
            [
                'name' => 'Elton DOSSOU (Promoteur)',
                'email' => 'promoteur@begpharma.bj',
                'role' => 'promoteur',
                'telephone' => '+229 97 00 00 01',
                'mfa_enabled' => true,
                'mfa_secret' => 'JBSWY3DPEHPK3PXP',
            ],
            [
                'name' => 'Dr Félicien AGBO (Pharmacien Titulaire)',
                'email' => 'pharmacien@begpharma.bj',
                'role' => 'pharmacien_titulaire',
                'telephone' => '+229 97 00 00 02',
                'mfa_enabled' => true,
                'mfa_secret' => 'JBSWY3DPEHPK3PXP',
                'numero_ordre' => 'ONPB-2018-0412',
            ],
            [
                'name' => 'Dr Carine HOUNGBO (Pharmacien Adjoint)',
                'email' => 'adjoint@begpharma.bj',
                'role' => 'pharmacien_adjoint',
                'telephone' => '+229 97 00 00 12',
                'mfa_enabled' => true,
                'mfa_secret' => 'JBSWY3DPEHPK3PXP',
                'numero_ordre' => 'ONPB-2022-0850',
            ],
            [
                'name' => 'Marcelle SOSSOU (Responsable Qualité RMQ)',
                'email' => 'rmq@begpharma.bj',
                'role' => 'rmq',
                'telephone' => '+229 97 00 00 04',
                'mfa_enabled' => true,
                'mfa_secret' => 'JBSWY3DPEHPK3PXP',
            ],
            [
                'name' => 'Gervais KPADONOU (Dispensateur)',
                'email' => 'dispensateur@begpharma.bj',
                'role' => 'dispensateur',
                'telephone' => '+229 97 00 00 03',
                'mfa_enabled' => false,
            ],
            [
                'name' => 'Amina BIO (Caissière)',
                'email' => 'caissier@begpharma.bj',
                'role' => 'caissier',
                'telephone' => '+229 97 00 00 05',
                'mfa_enabled' => false,
            ],
            [
                'name' => 'Basile TOHOUE (Magasinier)',
                'email' => 'magasinier@begpharma.bj',
                'role' => 'magasinier',
                'telephone' => '+229 97 00 00 06',
                'mfa_enabled' => false,
            ],
            [
                'name' => 'Pauline ZANNOU (Comptable)',
                'email' => 'comptable@begpharma.bj',
                'role' => 'comptable',
                'telephone' => '+229 97 00 00 07',
                'mfa_enabled' => true,
                'mfa_secret' => 'JBSWY3DPEHPK3PXP',
            ],
            [
                'name' => 'Romaric DEDJI (Agent d\'Entretien)',
                'email' => 'entretien@begpharma.bj',
                'role' => 'agent_entretien',
                'telephone' => '+229 97 00 00 08',
                'mfa_enabled' => false,
            ],
            [
                'name' => 'Inspecteur ABMed (Audit Réglementaire)',
                'email' => 'inspecteur@abmed.bj',
                'role' => 'inspecteur_abmed',
                'telephone' => '+229 21 31 00 99',
                'mfa_enabled' => false,
            ],
            [
                'name' => 'Support Technique BEG',
                'email' => 'admin@begpharma.bj',
                'role' => 'administrateur_beg',
                'telephone' => '+229 97 00 00 00',
                'mfa_enabled' => true,
                'mfa_secret' => 'JBSWY3DPEHPK3PXP',
            ],
        ];

        foreach ($usersConfig as $uc) {
            $user = User::updateOrCreate(
                ['email' => $uc['email']],
                [
                    'name' => $uc['name'],
                    'password' => Hash::make('Begpharma2026!'),
                    'telephone' => $uc['telephone'],
                    'mfa_enabled' => $uc['mfa_enabled'],
                    'mfa_secret' => $uc['mfa_secret'] ?? null,
                    'actif' => true,
                    'archived' => false,
                ]
            );

            UtilisateurOfficine::updateOrCreate(
                [
                    'officine_id' => $officineA->id,
                    'user_id' => $user->id,
                ],
                [
                    'role_code' => $uc['role'],
                    'actif' => true,
                    'archived' => false,
                ]
            );

            // Inscription à l'Ordre pour les pharmaciens
            if (isset($uc['numero_ordre'])) {
                DB::table('inscriptions_ordre')->updateOrInsert(
                    ['user_id' => $user->id, 'officine_id' => $officineA->id],
                    [
                        'id' => (string) Str::uuid(),
                        'numero_ordre' => $uc['numero_ordre'],
                        'section_ordre' => 'B',
                        'date_inscription' => '2018-06-01',
                        'date_echeance' => '2027-12-31',
                        'en_regle' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }

            // Fiche employé associée
            if ($uc['role'] !== 'inspecteur_abmed' && $uc['role'] !== 'administrateur_beg') {
                DB::table('employes')->updateOrInsert(
                    ['officine_id' => $officineA->id, 'nom_complet' => $uc['name']],
                    [
                        'id' => (string) Str::uuid(),
                        'poste' => $uc['role'],
                        'telephone' => $uc['telephone'],
                        'matricule' => 'EMP-' . strtoupper(substr($uc['role'], 0, 3)) . '-01',
                        'code_badge' => 'BDG-' . strtoupper(Str::random(6)),
                        'pin_code' => '1234',
                        'date_embauche' => '2024-01-02',
                        'date_visite_medicale' => '2026-02-15',
                        'charte_qualite_signee' => true,
                        'charte_signee_le' => now(),
                        'actif' => true,
                        'archived' => false,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }

        // 2. Modèles de la bibliothèque BPD (échantillon représentatif des 5 processus du Guide)
        $modeles = [
            [
                'code_ref' => 'TAM-DO-001',
                'processus' => 'TAM',
                'type_document' => 'DO',
                'titre' => 'Politique Qualité et Engagement de la Direction',
                'objet' => 'Formaliser l\'engagement de la direction dans la démarche qualité et le respect des BPD',
                'domaine_application' => 'Ensemble des activités de dispensation, stockage et approvisionnement de l\'officine',
                'articles_guide' => 'art. 1.3, 1.4',
                'contenu_modele' => "1. ENGAGEMENT DU TITULAIRE\nLa Pharmacie s'engage à assurer la qualité et la sécurité irréprochable des médicaments délivrés conformément au Guide BPD de l'ABMed.\n\n2. AXES STRATÉGIQUES\n- Maîtrise des conditions de conservation (température et chaîne du froid)\n- Dispensation sous la présence et le contrôle effectif d'un pharmacien inscrit\n- Amélioration continue via l'analyse systématique des non-conformités.",
            ],
            [
                'code_ref' => 'TAM-FI-001',
                'processus' => 'TAM',
                'type_document' => 'FI',
                'titre' => 'Fiche descriptive des 5 processus majeurs de l\'officine',
                'objet' => 'Décrire les interactions entre les processus TAM, QAM, GAD, GAC et GAR',
                'domaine_application' => 'Management global de l\'officine',
                'articles_guide' => 'art. 1.26, 1.27',
                'contenu_modele' => "PROCESSUS : TAM (Top Management), QAM (Qualité et Amélioration), GAD (Accueil et Dispensation), GAC (Approvisionnement et Conservation), GAR (Administration et Ressources).\nPilote de chaque processus désigné nominativement.",
            ],
            [
                'code_ref' => 'QAM-PR-001',
                'processus' => 'QAM',
                'type_document' => 'PR',
                'titre' => 'Procédure de détection, traitement des non-conformités et plan CAPA',
                'objet' => 'Définir la méthodologie de déclaration d\'un dysfonctionnement et le traitement des causes',
                'domaine_application' => 'Tout événement imprévu, anomalie de livraison, écart de température ou réclamation',
                'articles_guide' => 'art. 1.25, 1.29, 10.8',
                'contenu_modele' => "1. SIGNALEMENT\nTout agent ayant constaté une anomalie ouvre immédiatement une fiche de NC.\n\n2. ANALYSE DES CAUSES (5M)\nLe responsable qualité étudie les causes (Matière, Matériel, Main-d'œuvre, Méthode, Milieu).\n\n3. PLAN D'ACTIONS CORRECTIVES ET PRÉVENTIVES (CAPA)\nDéfinition d'un responsable, d'une échéance et vérification formelle de l'efficacité.",
            ],
            [
                'code_ref' => 'QAM-PL-001',
                'processus' => 'QAM',
                'type_document' => 'PL',
                'titre' => 'Tableau de bord et plan de maîtrise des actions qualité',
                'objet' => 'Planification et suivi annuel des actions d\'amélioration',
                'domaine_application' => 'Comité de pilotage qualité',
                'articles_guide' => 'art. 1.25, 10.8',
                'contenu_modele' => "Suivi hebdomadaire des actions qualité avec statut (En cours, En retard, Clôturé, Efficace).",
            ],
            [
                'code_ref' => 'GAD-PR-001',
                'processus' => 'GAD',
                'type_document' => 'PR',
                'titre' => 'Procédure d\'accueil, analyse d\'ordonnance et dispensation des médicaments',
                'objet' => 'Encadrer la délivrance des médicaments et l\'intervention pharmaceutique',
                'domaine_application' => 'Comptoir de vente et dispensation',
                'articles_guide' => 'art. 1.11, 7.7 à 7.16',
                'contenu_modele' => "1. VÉRIFICATION DE LA PRÉSENCE D'UN PHARMACIEN\nAucune dispensation ne peut être effectuée sans la présence effective d'un pharmacien sur place.\n\n2. ANALYSE RÉGLEMENTAIRE ET PHARMACEUTIQUE\nContrôle de la validité de la prescription, posologies, contre-indications et interactions.\n\n3. CONSEILS À LA DÉLIVRANCE\nExplication claire au patient sur la posologie, le moment de prise et les précautions.",
            ],
            [
                'code_ref' => 'GAC-PR-001',
                'processus' => 'GAC',
                'type_document' => 'PR',
                'titre' => 'Procédure de réception contrôlée et mise en stock selon le principe FEFO',
                'objet' => 'Contrôler la conformité des livraisons des répartiteurs et le rangement sécurisé',
                'domaine_application' => 'Magasin et réserve',
                'articles_guide' => 'art. 5.8 à 5.13',
                'contenu_modele' => "1. CONTRÔLE À RÉCEPTION\nVérification de l'intégrité des colis, de la conformité du bon de livraison et de la chaîne du froid.\n\n2. ENREGISTREMENT DU LOT ET DATE DE PÉREMPTION\nApplication stricte de la règle FEFO (First Expired, First Out).\n\n3. GESTION DES NON-CONFORMITÉS DE LIVRAISON\nIsolement immédiat en zone de quarantaine en cas de non-conformité.",
            ],
            [
                'code_ref' => 'GAR-PR-001',
                'processus' => 'GAR',
                'type_document' => 'PR',
                'titre' => 'Procédure d\'intégration, habilitation et formation continue du personnel',
                'objet' => 'Garantir la qualification et la formation continue de chaque employé',
                'domaine_application' => 'Gestion des ressources humaines de l\'officine',
                'articles_guide' => 'art. 2.1 à 2.21',
                'contenu_modele' => "1. DOSSIER RH ET QUALIFICATION\nVérification des diplômes originaux et de l'inscription à l'Ordre pour les pharmaciens.\n\n2. PLAN ANNUEL DE FORMATION\nSessions de formation obligatoire aux Bonnes Pratiques de Dispensation (BPD).\n\n3. POINTAGE ET HYGIÈNE\nPointage nominatif des présences et suivi des visites médicales d'aptitude.",
            ],
        ];

        foreach ($modeles as $m) {
            DB::table('modeles_bpd')->updateOrInsert(
                ['code_ref' => $m['code_ref']],
                array_merge($m, [
                    'id' => (string) Str::uuid(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );

            // Instancier directement ces modèles comme documents officiels de l'officine A
            DB::table('documents')->updateOrInsert(
                ['officine_id' => $officineA->id, 'code_document' => $m['code_ref']],
                [
                    'id' => (string) Str::uuid(),
                    'titre' => $m['titre'],
                    'categorie' => $m['type_document'],
                    'type_doc' => $m['type_document'],
                    'processus' => $m['processus'],
                    'contenu' => $m['contenu_modele'],
                    'version' => 1,
                    'indice_revision' => 0,
                    'statut' => 'valide',
                    'modele' => false,
                    'redacteur_nom' => 'Marcelle SOSSOU (RMQ)',
                    'approbateur_nom' => 'Dr Félicien AGBO (Titulaire)',
                    'approuve_le' => now(),
                    'valide_le' => now(),
                    'archived' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // 3. Fiches de Non-conformités et CAPA de départ
        DB::table('non_conformites')->updateOrInsert(
            ['officine_id' => $officineA->id, 'titre' => 'Écart de température chambre froide (+9°C relevé)'],
            [
                'id' => (string) Str::uuid(),
                'numero_nc' => 'NC-2026-001',
                'processus' => 'GAC',
                'source' => 'temperature',
                'description' => 'Température mesurée à +9°C pendant 45 minutes dans l\'enceinte réfrigérée à vaccins.',
                'gravite' => 'critique',
                'statut' => 'en_cours',
                'analyse_causes_5m' => 'Milieu/Matériel : Porte mal fermée suite au réapprovisionnement du matin + alarme sonore désactivée par erreur.',
                'action_immediate' => 'Fermeture de la porte, vérification des indicateurs temps-température des vaccins, transfert préventif en glacière de secours.',
                'action_preventive' => 'Installation d\'un rappel automatique de porte + réactivation obligatoire de la sirène d\'alerte sonore.',
                'date_echeance_capa' => date('Y-m-d', strtotime('+7 days')),
                'responsable_action' => 'Dr Félicien AGBO (Titulaire)',
                'archived' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // 4. Échéancier réglementaire initial complet (BPD Section 9)
        $echeancesInitiales = [
            [
                'titre' => 'Renouvellement Licence d\'Exploitation d\'Officine (ABMed)',
                'responsable' => 'Dr Félicien AGBO (Titulaire)',
                'categorie' => 'reglementaire',
                'priorite' => 'critique',
                'date_echeance' => '2026-12-31',
                'periodicite' => 'annuelle',
                'reglementaire' => true,
                'fait' => false,
                'notes' => 'Dossier complet à déposer auprès de l\'Agence Béninoise du Médicament 60 jours avant expiration.',
            ],
            [
                'titre' => 'Cotisation & Inscription Tableau de l\'Ordre Section B',
                'responsable' => 'Dr Félicien AGBO / Dr Claire TOSSOU',
                'categorie' => 'personnel',
                'priorite' => 'critique',
                'date_echeance' => date('Y-m-d', strtotime('+45 days')),
                'periodicite' => 'annuelle',
                'reglementaire' => true,
                'fait' => false,
                'notes' => 'Attestation de mise à jour annuelle du tableau de l\'Ordre National des Pharmaciens du Bénin.',
            ],
            [
                'titre' => 'Étalonnage métrologique annuel des sondes de température 2-8 °C',
                'responsable' => 'Dr Claire TOSSOU (RMQ)',
                'categorie' => 'equipement',
                'priorite' => 'critique',
                'date_echeance' => date('Y-m-d', strtotime('+14 days')),
                'periodicite' => 'annuelle',
                'reglementaire' => true,
                'fait' => false,
                'notes' => 'Organisme accrédité COFRAC / CEBTP. Certificat d\'étalonnage 3 points (2°C, 5°C, 8°C).',
            ],
            [
                'titre' => 'Contrôle annuel des extincteurs et robinets d\'incendie armés',
                'responsable' => 'M. Bienvenu KOUASSI (Logistique)',
                'categorie' => 'equipement',
                'priorite' => 'important',
                'date_echeance' => date('Y-m-d', strtotime('+20 days')),
                'periodicite' => 'annuelle',
                'reglementaire' => true,
                'fait' => false,
                'notes' => 'Vérification de la charge, des goupilles de sécurité et du carnet de sécurité incendie.',
            ],
            [
                'titre' => 'Traitement 3D trimestriel (Dératisation, Désinsectisation, Désinfection)',
                'responsable' => 'M. Bienvenu KOUASSI',
                'categorie' => 'locaux',
                'priorite' => 'important',
                'date_echeance' => date('Y-m-d', strtotime('-5 days')), // En retard pour démonstration alerte rouge ECH-05 / ECH-07
                'periodicite' => 'trimestrielle',
                'reglementaire' => true,
                'fait' => false,
                'notes' => 'Rapport du prestataire 3D agréé avec plan d\'appâtage et fiches de données de sécurité (FDS).',
            ],
            [
                'titre' => 'Revue annuelle de direction & politique qualité (BPD-1-M01)',
                'responsable' => 'Dr Félicien AGBO (Titulaire)',
                'categorie' => 'qualite',
                'priorite' => 'important',
                'date_echeance' => date('Y-m-d', strtotime('+60 days')),
                'periodicite' => 'annuelle',
                'reglementaire' => false,
                'fait' => false,
                'notes' => 'Bilan des réclamations, taux de service, écarts de température et auto-évaluation 267 articles.',
            ],
            [
                'titre' => 'Test annuel du Plan de Continuité d\'Activité (PRA / sauvegarde hors site)',
                'responsable' => 'Dr Claire TOSSOU (RMQ)',
                'categorie' => 'qualite',
                'priorite' => 'critique',
                'date_echeance' => date('Y-m-d', strtotime('+90 days')),
                'periodicite' => 'annuelle',
                'reglementaire' => true,
                'fait' => false,
                'notes' => 'Simulation de coupure réseau et bascule sur le serveur local autonome.',
            ],
            [
                'titre' => 'Visite médicale périodique d\'aptitude de l\'équipe',
                'responsable' => 'Dr Félicien AGBO',
                'categorie' => 'personnel',
                'priorite' => 'important',
                'date_echeance' => date('Y-m-d', strtotime('-12 days')), // Déjà réalisée dans l'historique
                'periodicite' => 'annuelle',
                'reglementaire' => true,
                'fait' => true,
                'date_realisation' => date('Y-m-d', strtotime('-10 days')),
                'preuve_titre' => 'Certificats_Aptitude_Medecine_Travail_2026.pdf',
                'notes' => 'Visites effectuées auprès du centre de médecine du travail agréé.',
            ],
        ];

        foreach ($echeancesInitiales as $ech) {
            DB::table('echeances')->updateOrInsert(
                ['officine_id' => $officineA->id, 'titre' => $ech['titre']],
                array_merge($ech, [
                    'id' => (string) Str::uuid(),
                    'created_by' => $user->id,
                    'archived' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}

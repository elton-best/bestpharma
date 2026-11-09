<?php

namespace Database\Seeders;

use App\Models\Officine;
use App\Models\Ordonnance;
use App\Models\Patient;
use App\Models\Prescripteur;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DossierPatientSeeder extends Seeder
{
    public function run(): void
    {
        $officineA = Officine::where('numero_licence', 'BEN-OFF-2025-001')->first()
            ?? Officine::first();

        if (! $officineA) {
            return;
        }

        // 1. Prescripteurs de référence
        $drDossou = Prescripteur::firstOrCreate(
            ['nom_complet' => 'Dr. Paul DOSSOU', 'officine_id' => $officineA->id],
            [
                'id' => (string) Str::uuid(),
                'titre' => 'Dr',
                'specialite' => 'Gynécologue-Obstétricien',
                'numero_ordre' => '1042/CNOM-BEN',
                'centre_sante' => 'Clinique Mahouna Cotonou',
                'telephone' => '+229 97 20 30 40',
                'ville' => 'Cotonou',
                'actif' => true,
            ]
        );

        $drTossou = Prescripteur::firstOrCreate(
            ['nom_complet' => 'Dr. Marc TOSSOU', 'officine_id' => $officineA->id],
            [
                'id' => (string) Str::uuid(),
                'titre' => 'Dr',
                'specialite' => 'Pédiatre',
                'numero_ordre' => '0892/CNOM-BEN',
                'centre_sante' => 'CNHU HKM Cotonou',
                'telephone' => '+229 95 11 22 33',
                'ville' => 'Cotonou',
                'actif' => true,
            ]
        );

        $drKanho = Prescripteur::firstOrCreate(
            ['nom_complet' => 'Dr. Solange KANHO', 'officine_id' => $officineA->id],
            [
                'id' => (string) Str::uuid(),
                'titre' => 'Dr',
                'specialite' => 'Cardiologue',
                'numero_ordre' => '1420/CNOM-BEN',
                'centre_sante' => 'Hôpital de zone de Ménontin',
                'telephone' => '+229 96 44 55 66',
                'ville' => 'Cotonou',
                'actif' => true,
            ]
        );

        // 2. Patients exemplaires du Dossier Pharmaceutique
        $patient1 = Patient::firstOrCreate(
            ['code_patient' => 'PAT-2026-0001', 'officine_id' => $officineA->id],
            [
                'id' => (string) Str::uuid(),
                'nom' => 'SOSSOU',
                'prenom' => 'Claire',
                'sexe' => 'F',
                'date_naissance' => '1996-03-15',
                'age' => 30,
                'telephone' => '+229 97 12 34 56',
                'email' => 'claire.sossou@example.com',
                'adresse' => 'Quartier Haie Vive, Cotonou',
                'ville' => 'Cotonou',
                'groupe_sanguin' => 'O+',
                'poids_kg' => 64.0,
                'taille_cm' => 165.0,
                'est_enceinte' => true,
                'est_allaitante' => false,
                'pathologies_chroniques' => ['Hypertension gravidique'],
                'allergies_declarees' => ['Pénicillines', 'Amoxicilline'],
                'notes_cliniques' => 'Grossesse au 2e trimestre. Attention formelle aux AINS et bétalactamines.',
                'consentement_dp' => true,
                'actif' => true,
            ]
        );

        $patient2 = Patient::firstOrCreate(
            ['code_patient' => 'PAT-2026-0002', 'officine_id' => $officineA->id],
            [
                'id' => (string) Str::uuid(),
                'nom' => 'KPADONOU',
                'prenom' => 'Mathieu',
                'sexe' => 'M',
                'date_naissance' => '1960-08-22',
                'age' => 66,
                'telephone' => '+229 95 88 77 66',
                'email' => 'mathieu.kpadonou@example.com',
                'adresse' => 'Quartier Sainte-Rita, Cotonou',
                'ville' => 'Cotonou',
                'groupe_sanguin' => 'A+',
                'poids_kg' => 82.5,
                'taille_cm' => 174.0,
                'est_enceinte' => false,
                'est_allaitante' => false,
                'pathologies_chroniques' => ['Diabète Type 2', 'Hypertension artérielle'],
                'allergies_declarees' => ['Sulfamides'],
                'notes_cliniques' => 'Suivi cardiologique régulier. Contrôle régulier de la glycémie.',
                'consentement_dp' => true,
                'actif' => true,
            ]
        );

        $patient3 = Patient::firstOrCreate(
            ['code_patient' => 'PAT-2026-0003', 'officine_id' => $officineA->id],
            [
                'id' => (string) Str::uuid(),
                'nom' => 'AGBOSSA',
                'prenom' => 'Wilfried',
                'sexe' => 'M',
                'date_naissance' => '2014-11-05',
                'age' => 12,
                'telephone' => '+229 96 11 22 44',
                'adresse' => 'Fidjrossè Calvaire, Cotonou',
                'ville' => 'Cotonou',
                'poids_kg' => 38.0,
                'taille_cm' => 146.0,
                'est_enceinte' => false,
                'est_allaitante' => false,
                'pathologies_chroniques' => ['Asthme bronchique'],
                'allergies_declarees' => ['Aspirine', 'AINS'],
                'notes_cliniques' => 'Enfant asthmatique. Risque de bronchospasme sous AINS.',
                'consentement_dp' => true,
                'actif' => true,
            ]
        );

        // 3. Ordonnances Médicales
        Ordonnance::firstOrCreate(
            ['numero_ordonnance' => 'ORD-2026-0001', 'officine_id' => $officineA->id],
            [
                'id' => (string) Str::uuid(),
                'patient_id' => $patient1->id,
                'prescripteur_id' => $drDossou->id,
                'date_prescription' => Carbon::now()->subDays(5)->format('Y-m-d'),
                'date_expiration' => Carbon::now()->addMonths(3)->format('Y-m-d'),
                'duree_traitement_jours' => 30,
                'nombre_renouvellements_autorises' => 2,
                'nombre_renouvellements_effectues' => 0,
                'statut' => 'active',
                'diagnostic_presume' => 'Suivi obstétrical - Anémie gestationnelle modérée',
                'lignes_prescrites' => [
                    ['medicament' => 'Tardyferon B9', 'posologie' => '1 cp le matin', 'duree' => '30 jours'],
                    ['medicament' => 'Paracétamol 1g', 'posologie' => '1 cp si céphalée (max 3/j)', 'duree' => '10 jours'],
                ],
                'commentaires_pharmacien' => 'Vérifier la bonne tolérance digestive du fer.',
            ]
        );

        Ordonnance::firstOrCreate(
            ['numero_ordonnance' => 'ORD-2026-0002', 'officine_id' => $officineA->id],
            [
                'id' => (string) Str::uuid(),
                'patient_id' => $patient2->id,
                'prescripteur_id' => $drKanho->id,
                'date_prescription' => Carbon::now()->subDays(10)->format('Y-m-d'),
                'date_expiration' => Carbon::now()->addMonths(6)->format('Y-m-d'),
                'duree_traitement_jours' => 30,
                'nombre_renouvellements_autorises' => 3,
                'nombre_renouvellements_effectues' => 1,
                'statut' => 'active',
                'diagnostic_presume' => 'Traitement de fond HTA essentielle',
                'lignes_prescrites' => [
                    ['medicament' => 'Amlodipine 5mg', 'posologie' => '1 cp le matin', 'duree' => '30 jours'],
                    ['medicament' => 'Metformine 1000mg', 'posologie' => '1 cp midi et soir au repas', 'duree' => '30 jours'],
                ],
                'commentaires_pharmacien' => 'Renouvellement 1/3 effectué le 5 du mois.',
            ]
        );
    }
}

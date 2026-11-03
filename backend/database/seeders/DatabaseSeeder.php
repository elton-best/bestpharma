<?php

namespace Database\Seeders;

use App\Models\Officine;
use App\Models\OfficineParametre;
use App\Models\User;
use App\Models\UtilisateurOfficine;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $google2fa = new Google2FA;
        $demoMfaSecret = 'JBSWY3DPEHPK3PXP'; // Secret TOTP de démo valide

        // 1. Création des utilisateurs démo
        $promoteur = User::create([
            'name' => 'Dr. Anicet ANIAMBOSSOU',
            'email' => 'promoteur@begpharma.bj',
            'password' => Hash::make('Begpharma2026!'),
            'telephone' => '+229 97 00 00 01',
            'mfa_secret' => $demoMfaSecret,
            'mfa_enabled' => true,
            'mfa_enforced' => true,
            'actif' => true,
        ]);

        $pharmacien = User::create([
            'name' => 'Dr. Marcelle HOUNNOU',
            'email' => 'pharmacien@begpharma.bj',
            'password' => Hash::make('Begpharma2026!'),
            'telephone' => '+229 97 00 00 02',
            'mfa_secret' => $demoMfaSecret,
            'mfa_enabled' => true,
            'mfa_enforced' => true,
            'actif' => true,
        ]);

        $dispensateur = User::create([
            'name' => 'Gervais KPADONOU',
            'email' => 'dispensateur@begpharma.bj',
            'password' => Hash::make('Begpharma2026!'),
            'telephone' => '+229 97 00 00 03',
            'mfa_enabled' => false,
            'mfa_enforced' => false,
            'actif' => true,
        ]);

        $utilisateurB = User::create([
            'name' => 'Utilisateur Officine B',
            'email' => 'agent.b@begpharma.bj',
            'password' => Hash::make('Begpharma2026!'),
            'telephone' => '+229 97 00 00 04',
            'mfa_enabled' => false,
            'mfa_enforced' => false,
            'actif' => true,
        ]);

        // 2. Officine A : Pharmacie de l'Étoile (Cotonou)
        $officineA = Officine::create([
            'nom' => 'Pharmacie de l\'Étoile',
            'raison_sociale' => 'Pharmacie de l\'Étoile SARL',
            'numero_licence' => 'BEN-OFF-2025-001',
            'date_licence' => '2025-03-01',
            'adresse' => 'Avenue Steinmetz, Carré 124',
            'ville' => 'Cotonou',
            'telephone' => '+229 21 31 10 20',
            'email' => 'etoile@begpharma.bj',
            'regime_fiscal' => 'Réel normal',
            'fuseau' => 'Africa/Porto-Novo',
            'devise' => 'XOF',
            'actif' => true,
            'created_by' => $promoteur->id,
        ]);

        // 3. Officine B : Pharmacie du Littoral (Porto-Novo)
        $officineB = Officine::create([
            'nom' => 'Pharmacie du Littoral',
            'raison_sociale' => 'Pharmacie du Littoral SAS',
            'numero_licence' => 'BEN-OFF-2025-002',
            'date_licence' => '2025-05-15',
            'adresse' => 'Boulevard Lagunaire',
            'ville' => 'Porto-Novo',
            'telephone' => '+229 20 22 45 80',
            'email' => 'littoral@begpharma.bj',
            'regime_fiscal' => 'Réel normal',
            'fuseau' => 'Africa/Porto-Novo',
            'devise' => 'XOF',
            'actif' => true,
            'created_by' => $promoteur->id,
        ]);

        // 4. Rattachements
        // Promoteur a accès aux 2 officines
        UtilisateurOfficine::create([
            'officine_id' => $officineA->id,
            'user_id' => $promoteur->id,
            'role_code' => 'promoteur',
            'actif' => true,
            'created_by' => $promoteur->id,
        ]);
        UtilisateurOfficine::create([
            'officine_id' => $officineB->id,
            'user_id' => $promoteur->id,
            'role_code' => 'promoteur',
            'actif' => true,
            'created_by' => $promoteur->id,
        ]);

        // Pharmacien et dispensateur rattachés uniquement à l'Officine A
        UtilisateurOfficine::create([
            'officine_id' => $officineA->id,
            'user_id' => $pharmacien->id,
            'role_code' => 'pharmacien_titulaire',
            'actif' => true,
            'created_by' => $promoteur->id,
        ]);
        UtilisateurOfficine::create([
            'officine_id' => $officineA->id,
            'user_id' => $dispensateur->id,
            'role_code' => 'dispensateur',
            'actif' => true,
            'created_by' => $promoteur->id,
        ]);

        // Utilisateur B rattaché uniquement à l'Officine B
        UtilisateurOfficine::create([
            'officine_id' => $officineB->id,
            'user_id' => $utilisateurB->id,
            'role_code' => 'dispensateur',
            'actif' => true,
            'created_by' => $promoteur->id,
        ]);

        // 5. Paramètres d'officine par défaut pour les deux officines
        $defaultParams = [
            ['cle' => 'fuseau_horaire', 'valeur' => ['valeur' => 'Africa/Porto-Novo'], 'type_donnee' => 'string', 'description' => 'Fuseau horaire officiel du Bénin'],
            ['cle' => 'devise', 'valeur' => ['valeur' => 'XOF'], 'type_donnee' => 'string', 'description' => 'Devise en Francs CFA sans décimale'],
            ['cle' => 'delai_inactivite_minutes', 'valeur' => ['valeur' => 15], 'type_donnee' => 'number', 'description' => 'Délai d inactivité avant verrouillage automatique'],
            ['cle' => 'tolerance_pointage_minutes', 'valeur' => ['valeur' => 10], 'type_donnee' => 'number', 'description' => 'Tolérance de pointage en minutes'],
            ['cle' => 'mode_presence_pharmacien', 'valeur' => ['valeur' => 'alerte'], 'type_donnee' => 'string', 'description' => 'Mode pharmacien présent : alerte ou blocage'],
            ['cle' => 'conservation_registres_ans', 'valeur' => ['valeur' => 10], 'type_donnee' => 'number', 'description' => 'Durée légale de conservation des registres'],
        ];

        foreach ([$officineA, $officineB] as $off) {
            foreach ($defaultParams as $p) {
                OfficineParametre::create([
                    'officine_id' => $off->id,
                    'cle' => $p['cle'],
                    'valeur' => $p['valeur'],
                    'type_donnee' => $p['type_donnee'],
                    'description' => $p['description'],
                    'version' => 1,
                    'created_by' => $promoteur->id,
                ]);
            }
        }
    }
}

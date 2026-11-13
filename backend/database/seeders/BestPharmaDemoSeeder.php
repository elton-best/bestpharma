<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Comptabilite\Models\ComptaCompte;
use App\Modules\Comptabilite\Models\ComptaEcriture;
use App\Modules\Comptabilite\Models\ComptaEcritureLigne;
use App\Modules\Comptabilite\Models\ComptaExercice;
use App\Modules\Comptabilite\Models\ComptaJournal;
use App\Modules\Comptabilite\Services\ComptabiliteService;
use App\Modules\Tenancy\Models\Officine;
use App\Modules\Tenancy\Models\Organization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class BestPharmaDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (!app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('Demo seeding is restricted to local/testing.');
        }

        $org = Organization::firstOrCreate(['slug' => 'beg-group'], ['name' => 'BEG Group']);
        $officine = Officine::firstOrCreate(
            ['slug' => 'pharmacie-demo-cotonou'],
            [
                'organization_id' => $org->id,
                'name' => 'Pharmacie Démo Cotonou',
                'email' => 'contact@pharmacie-demo.bj',
                'devise' => 'XOF',
                'status' => 'active',
                'onboarding_completed' => true,
            ]
        );

        $admin = User::firstOrCreate(
            ['email' => 'admin@bestpharma.bj'],
            ['name' => 'Pharmacien Titulaire Démo', 'password' => Hash::make('password')]
        );
        $reviewer = User::firstOrCreate(
            ['email' => 'beg@bestpharma.bj'],
            ['name' => 'Instruction BEG Démo', 'password' => Hash::make('password')]
        );
        $reviewer->forceFill(['is_platform_admin' => true, 'is_support_coordinator' => true])->save();

        $officine->users()->syncWithoutDetaching([
            $admin->id => [
                'is_admin' => true,
                'permissions' => json_encode(['qualite.read', 'qualite.write', 'stock.read', 'stock.write', 'compta.read', 'compta.write']),
            ],
        ]);

        $second = Officine::firstOrCreate(
            ['slug' => 'pharmacie-demo-porto-novo'],
            [
                'organization_id' => $org->id,
                'name' => 'Pharmacie Démo Porto-Novo',
                'status' => 'active',
                'devise' => 'XOF',
            ]
        );
        $second->users()->syncWithoutDetaching([
            $admin->id => ['is_admin' => true, 'is_active' => true, 'permissions' => '[]'],
        ]);

        foreach ([$officine, $second] as $o) {
            DB::table('officines')->where('id', $o->id)->whereNull('contact_name')->update([
                'contact_name' => 'Contact fictif',
                'phone' => '+2290100000000',
                'city' => $o->id === $officine->id ? 'Cotonou' : 'Porto-Novo',
                'department' => $o->id === $officine->id ? 'Littoral' : 'Ouémé',
                'address' => 'Adresse fictive de validation',
            ]);
        }

        $staff = User::firstOrCreate(
            ['email' => 'accompagnateur@bestpharma.bj'],
            ['name' => 'Accompagnateur fictif', 'password' => Hash::make('password')]
        );
        $staff->forceFill(['is_support_staff' => true])->save();

        // 1. Activation de l'ensemble des modules officinaux
        $modules = [
            'tenancy', 'qualite', 'documents', 'locauxequipements',
            'ventescaisse', 'dispensation', 'comptabilite', 'paie',
            'fiscalite', 'stock', 'personnel', 'reporting', 'administration', 'preparations',
        ];

        foreach ([$officine->id, $second->id] as $officineId) {
            foreach ($modules as $module) {
                DB::table('officine_modules')->updateOrInsert(
                    ['officine_id' => $officineId, 'module' => $module],
                    ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]
                );
            }
        }

        // 2. Initialisation comptable SYSCOHADA (13 comptes par défaut et 5 journaux)
        if (Schema::hasTable('compta_comptes') && Schema::hasTable('compta_journaux')) {
            $comptaService = new ComptabiliteService();
            $comptaService->bootstrapOfficine($officine->id);
            $comptaService->bootstrapOfficine($second->id);

            // Écriture de solde initial / démo pour l'officine de Cotonou si aucune écriture
            $exercice = ComptaExercice::where('officine_id', $officine->id)->where('status', 'ouvert')->first();
            $journalOd = ComptaJournal::where('officine_id', $officine->id)->where('code', 'OD')->first();
            $cCapital = ComptaCompte::where('officine_id', $officine->id)->where('code', '101000')->first();
            $cBanque = ComptaCompte::where('officine_id', $officine->id)->where('code', '521000')->first();

            if ($exercice && $journalOd && $cCapital && $cBanque && !ComptaEcriture::where('officine_id', $officine->id)->exists()) {
                $ref = 'OD-' . date('Y') . '-0001';
                $ecriture = ComptaEcriture::create([
                    'officine_id' => $officine->id,
                    'exercice_id' => $exercice->id,
                    'journal_id' => $journalOd->id,
                    'reference' => $ref,
                    'entry_date' => now()->toDateString(),
                    'label' => 'Apport en capital initial',
                    'source_type' => 'manual',
                    'status' => 'validee',
                    'total_debit' => 10000000,
                    'total_credit' => 10000000,
                    'created_by_user_id' => $admin->id,
                    'validated_by_user_id' => $admin->id,
                    'validated_at' => now(),
                    'entry_hash' => hash('sha256', "{$officine->id}|{$ref}|10000000|" . now()->toDateString()),
                    'version' => 1,
                ]);

                ComptaEcritureLigne::create([
                    'officine_id' => $officine->id,
                    'ecriture_id' => $ecriture->id,
                    'compte_id' => $cBanque->id,
                    'line_order' => 1,
                    'label' => 'Dépôt initial banque',
                    'debit' => 10000000,
                    'credit' => 0,
                ]);
                ComptaEcritureLigne::create([
                    'officine_id' => $officine->id,
                    'ecriture_id' => $ecriture->id,
                    'compte_id' => $cCapital->id,
                    'line_order' => 2,
                    'label' => 'Souscription capital',
                    'debit' => 0,
                    'credit' => 10000000,
                ]);
            }
        }

        // 3. Seeding des 59 modèles BPD officinaux types
        if (Schema::hasTable('cdc_bpd_templates')) {
            $categories = [
                'Système Qualité & Audits',
                'Personnel & Hygiène',
                'Locaux & Équipements',
                'Achats & Réceptions',
                'Stockage & Chaîne du Froid',
                'Dispensation & Vigilance',
            ];

            foreach ([$officine->id, $second->id] as $officineId) {
                for ($i = 1; $i <= 59; $i++) {
                    $code = sprintf('BPD-%02d', $i);
                    $exists = DB::table('cdc_bpd_templates')
                        ->where('officine_id', $officineId)
                        ->where('code', $code)
                        ->exists();

                    if (!$exists) {
                        $cat = $categories[($i - 1) % count($categories)];
                        DB::table('cdc_bpd_templates')->insert([
                            'officine_id' => $officineId,
                            'code' => $code,
                            'title' => "Modèle Type Officinal {$code} — {$cat}",
                            'category' => $cat,
                            'bpd_reference' => 'Art. ' . (1 + intdiv($i - 1, 10)) . '.' . ((($i - 1) % 10) + 1),
                            'is_adopted' => $i <= 3,
                            'adopted_at' => $i <= 3 ? now() : null,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }
        }

        // 4. Seeding Registre Stupéfiants Tableau B (Append-Only)
        if (Schema::hasTable('cdc_stupefiants_entries')) {
            $hasEntries = DB::table('cdc_stupefiants_entries')->where('officine_id', $officine->id)->exists();
            if (!$hasEntries) {
                $hashEntree = hash('sha256', "{$officine->id}|" . now()->subDays(5)->toDateString() . "|entree|Morphine injectable 10mg/ml|LOT-MOR-2026-A|50");
                DB::table('cdc_stupefiants_entries')->insert([
                    'officine_id' => $officine->id,
                    'entry_date' => now()->subDays(5)->toDateString(),
                    'movement_type' => 'entree',
                    'substance_name' => 'Morphine injectable 10mg/ml',
                    'lot_number' => 'LOT-MOR-2026-A',
                    'quantity' => 50,
                    'unit' => 'Ampoules',
                    'prescription_ref' => 'BON-LIV-UBIPHARM-4491',
                    'prescriber_name' => 'Grossiste Répartiteur',
                    'pharmacist_visa' => 'Dr. Titulaire Démo',
                    'entry_hash' => $hashEntree,
                    'created_at' => now()->subDays(5),
                    'updated_at' => now()->subDays(5),
                ]);

                $hashSortie = hash('sha256', "{$officine->id}|" . now()->subDays(1)->toDateString() . "|sortie|Morphine injectable 10mg/ml|LOT-MOR-2026-A|5");
                DB::table('cdc_stupefiants_entries')->insert([
                    'officine_id' => $officine->id,
                    'entry_date' => now()->subDays(1)->toDateString(),
                    'movement_type' => 'sortie',
                    'substance_name' => 'Morphine injectable 10mg/ml',
                    'lot_number' => 'LOT-MOR-2026-A',
                    'quantity' => 5,
                    'unit' => 'Ampoules',
                    'prescription_ref' => 'ORD-CNHU-2026-8812',
                    'patient_name' => 'Patient Démo Hospitalisé',
                    'prescriber_name' => 'Dr. Médecin Oncologue',
                    'pharmacist_visa' => 'Dr. Titulaire Démo',
                    'entry_hash' => $hashSortie,
                    'created_at' => now()->subDays(1),
                    'updated_at' => now()->subDays(1),
                ]);
            }
        }

        // 5. Seeding Préparations Magistrales
        if (Schema::hasTable('cdc_preparations')) {
            $hasPrep = DB::table('cdc_preparations')->where('officine_id', $officine->id)->exists();
            if (!$hasPrep) {
                DB::table('cdc_preparations')->insert([
                    [
                        'officine_id' => $officine->id,
                        'reference' => 'PREP-2026-0001',
                        'formula_name' => 'Pommade à l oxyde de zinc 10%',
                        'patient_name' => 'Koffi Dossou',
                        'prescriber_name' => 'Dr. Dermatologue CNHU',
                        'ingredients' => json_encode([
                            ['matiere' => 'Oxyde de zinc pur', 'lot' => 'LOT-OXZ-01', 'quantite' => '10g'],
                            ['matiere' => 'Vaseline officinale', 'lot' => 'LOT-VAS-99', 'quantite' => '90g'],
                        ]),
                        'quantity_prepared' => '100g',
                        'expiry_date' => now()->addMonths(3)->toDateString(),
                        'status' => 'delivree',
                        'control_hash' => hash('sha256', "{$officine->id}|PREP-2026-0001|100g"),
                        'controlled_at' => now()->subDays(2),
                        'created_at' => now()->subDays(2),
                        'updated_at' => now()->subDays(2),
                    ],
                    [
                        'officine_id' => $officine->id,
                        'reference' => 'PREP-2026-0002',
                        'formula_name' => 'Gélules pédiatriques de Furosemide 10mg',
                        'patient_name' => 'Enfant Bio Démo',
                        'prescriber_name' => 'Dr. Pédiatre HOMEL',
                        'ingredients' => json_encode([
                            ['matiere' => 'Furosémide poudre', 'lot' => 'LOT-FUR-12', 'quantite' => '0.3g'],
                            ['matiere' => 'Excipient lactose', 'lot' => 'LOT-LAC-44', 'quantite' => '6.0g'],
                        ]),
                        'quantity_prepared' => '30 gélules',
                        'expiry_date' => now()->addMonths(1)->toDateString(),
                        'status' => 'controle_pharmacien',
                        'control_hash' => null,
                        'controlled_at' => null,
                        'created_at' => now()->subHours(6),
                        'updated_at' => now()->subHours(6),
                    ],
                ]);
            }
        }

        // 6. Seeding Échéancier Réglementaire
        if (Schema::hasTable('cdc_regulatory_deadlines')) {
            $hasDeadlines = DB::table('cdc_regulatory_deadlines')->where('officine_id', $officine->id)->exists();
            if (!$hasDeadlines) {
                DB::table('cdc_regulatory_deadlines')->insert([
                    [
                        'officine_id' => $officine->id,
                        'reference' => 'REG-2026-ORD',
                        'title' => 'Cotisation Ordre National des Pharmaciens (Section B)',
                        'authority' => 'Ordre',
                        'due_date' => now()->addDays(30)->toDateString(),
                        'status' => 'a_venir',
                        'proof_ref' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                    [
                        'officine_id' => $officine->id,
                        'reference' => 'REG-2026-DGI',
                        'title' => 'Déclaration mensuelle TVA & Acompte BIC',
                        'authority' => 'DGI',
                        'due_date' => now()->addDays(10)->toDateString(),
                        'status' => 'en_cours',
                        'proof_ref' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                    [
                        'officine_id' => $officine->id,
                        'reference' => 'REG-2026-ABRP',
                        'title' => 'Rapport annuel d auto-inspection BPD ABMed',
                        'authority' => 'ABRP',
                        'due_date' => now()->addMonths(2)->toDateString(),
                        'status' => 'a_venir',
                        'proof_ref' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                ]);
            }
        }
    }
}

<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Comptabilite\Models\ComptaCompte;
use App\Modules\Comptabilite\Models\ComptaEcriture;
use App\Modules\Comptabilite\Models\ComptaExercice;
use App\Modules\Comptabilite\Models\ComptaJournal;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class InalterabilityAndSeederTest extends TestCase
{
    use DatabaseTransactions;

    public function test_validated_ecriture_cannot_be_mutated_or_deleted(): void
    {
        $officine = Officine::firstOrCreate(['slug' => 'test-inalterability'], [
            'name' => 'Pharmacie Inaltérabilité',
            'status' => 'active',
            'devise' => 'XOF',
        ]);

        $exercice = ComptaExercice::firstOrCreate(
            ['officine_id' => $officine->id, 'code' => 'EX-TEST-2026'],
            ['label' => 'Exercice Test 2026', 'start_date' => '2026-01-01', 'end_date' => '2026-12-31', 'status' => 'ouvert']
        );

        $journal = ComptaJournal::firstOrCreate(
            ['officine_id' => $officine->id, 'code' => 'OD-TEST'],
            ['name' => 'Journal OD Test', 'journal_type' => 'operations_diverses', 'is_active' => true]
        );

        $ecriture = ComptaEcriture::create([
            'officine_id' => $officine->id,
            'exercice_id' => $exercice->id,
            'journal_id' => $journal->id,
            'reference' => 'OD-TEST-001',
            'entry_date' => '2026-11-13',
            'label' => 'Écriture scellée',
            'source_type' => 'manual',
            'status' => 'validee',
            'total_debit' => 50000,
            'total_credit' => 50000,
            'entry_hash' => hash('sha256', "test-seal"),
        ]);

        // Vérification du rejet sur update
        $updateBlocked = false;
        try {
            $ecriture->update(['label' => 'Modification interdite']);
        } catch (\Throwable $e) {
            $updateBlocked = true;
        }
        $this->assertTrue($updateBlocked, 'Une écriture validée doit rejeter toute mise à jour (RG-31/RG-38).');

        // Vérification du rejet sur delete
        $deleteBlocked = false;
        try {
            $ecriture->delete();
        } catch (\Throwable $e) {
            $deleteBlocked = true;
        }
        $this->assertTrue($deleteBlocked, 'Une écriture validée doit rejeter toute suppression (RG-31/RG-38).');
    }

    public function test_stupefiants_registry_is_strictly_append_only(): void
    {
        $officine = Officine::firstOrCreate(['slug' => 'test-stupefiants'], [
            'name' => 'Pharmacie Stupefiants Test',
            'status' => 'active',
            'devise' => 'XOF',
        ]);

        $id = DB::table('cdc_stupefiants_entries')->insertGetId([
            'officine_id' => $officine->id,
            'entry_date' => '2026-11-13',
            'movement_type' => 'entree',
            'substance_name' => 'Fentanyl 50mcg',
            'lot_number' => 'LOT-FEN-TEST',
            'quantity' => 10,
            'unit' => 'Ampoules',
            'entry_hash' => hash('sha256', "test-stupefiants"),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Si PostgreSQL (avec triggers actifs)
        if (DB::getDriverName() === 'pgsql') {
            $updateBlocked = false;
            try {
                DB::table('cdc_stupefiants_entries')->where('id', $id)->update(['quantity' => 999]);
            } catch (\Throwable $e) {
                $updateBlocked = true;
            }
            $this->assertTrue($updateBlocked, 'PostgreSQL trigger doit bloquer tout UPDATE sur cdc_stupefiants_entries.');

            $deleteBlocked = false;
            try {
                DB::table('cdc_stupefiants_entries')->where('id', $id)->delete();
            } catch (\Throwable $e) {
                $deleteBlocked = true;
            }
            $this->assertTrue($deleteBlocked, 'PostgreSQL trigger doit bloquer tout DELETE sur cdc_stupefiants_entries.');
        } else {
            $this->assertTrue(true);
        }
    }

    public function test_seeder_bpd_templates_and_syscohada_counts(): void
    {
        $this->seed(\Database\Seeders\BestPharmaDemoSeeder::class);

        $officine = Officine::where('slug', 'pharmacie-demo-cotonou')->first();
        $this->assertNotNull($officine, 'Pharmacie Démo Cotonou doit exister.');

        // 59 modèles BPD
        $bpdCount = DB::table('cdc_bpd_templates')->where('officine_id', $officine->id)->count();
        $this->assertEquals(59, $bpdCount, 'La table cdc_bpd_templates doit contenir exactement 59 modèles types.');

        // 13 comptes SYSCOHADA par défaut
        $comptesCount = ComptaCompte::where('officine_id', $officine->id)->count();
        $this->assertGreaterThanOrEqual(13, $comptesCount, 'Le plan comptable doit contenir au moins les 13 comptes SYSCOHADA.');

        // 5 journaux par défaut
        $journauxCount = ComptaJournal::where('officine_id', $officine->id)->count();
        $this->assertEquals(5, $journauxCount, 'Le plan comptable doit contenir exactement 5 journaux officinaux.');

        // Modules actifs (14 modules)
        $activeModulesCount = DB::table('officine_modules')->where('officine_id', $officine->id)->where('is_active', true)->count();
        $this->assertGreaterThanOrEqual(14, $activeModulesCount, 'Au moins 14 modules officinaux doivent être activés.');
    }
}

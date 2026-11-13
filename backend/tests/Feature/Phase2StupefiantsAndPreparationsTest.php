<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Stock\Models\Lot;
use App\Modules\Stock\Models\Product;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class Phase2StupefiantsAndPreparationsTest extends TestCase
{
    use DatabaseTransactions;

    protected function makeUserFor(Officine $officine, array $permissions = ['qualite.read', 'qualite.write', 'stock.read', 'stock.write']): User
    {
        $user = User::create([
            'name' => 'Pharmacien Test ' . uniqid(),
            'email' => 'pharmacien-' . uniqid() . '@example.test',
            'password' => bcrypt('password123'),
        ]);

        \Illuminate\Support\Facades\DB::table('officine_user')->insert([
            'officine_id' => $officine->id,
            'user_id' => $user->id,
            'is_admin' => true,
            'is_active' => true,
            'permissions' => json_encode($permissions),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach (['qualite', 'stock', 'dispensation', 'preparations'] as $mod) {
            \Illuminate\Support\Facades\DB::table('officine_modules')->updateOrInsert(
                ['officine_id' => $officine->id, 'module' => $mod],
                ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        return $user;
    }

    public function test_stupefiants_balance_and_pv_destruction_lifecycle(): void
    {
        $officine = Officine::create([
            'slug' => 'pharmacie-test-stupefiants-' . uniqid(),
            'name' => 'Pharmacie Test Stupéfiants',
            'status' => 'active',
            'devise' => 'XOF',
        ]);
        $user = $this->makeUserFor($officine);

        // 1. Entrée au registre
        $resEntree = $this->actingAs($user)
            ->withHeaders(['X-Officine-ID' => (string) $officine->id])
            ->postJson('/api/v1/qualite/cdc-extras/stupefiants', [
                'entry_date' => '2026-11-13',
                'movement_type' => 'entree',
                'substance_name' => 'Morphine injectable 10mg',
                'lot_number' => 'LOT-MOR-01',
                'quantity' => 100,
                'unit' => 'Ampoules',
                'prescription_ref' => 'BL-GROSSISTE-101',
                'pharmacist_visa' => 'Dr. Titulaire Test',
            ]);
        $resEntree->assertCreated();
        $this->assertNotEmpty($resEntree->json('data.entry_hash'));

        // 2. Sortie au registre (dispensation)
        $resSortie = $this->actingAs($user)
            ->withHeaders(['X-Officine-ID' => (string) $officine->id])
            ->postJson('/api/v1/qualite/cdc-extras/stupefiants', [
                'entry_date' => '2026-11-13',
                'movement_type' => 'sortie',
                'substance_name' => 'Morphine injectable 10mg',
                'lot_number' => 'LOT-MOR-01',
                'quantity' => 20,
                'unit' => 'Ampoules',
                'prescription_ref' => 'ORD-SEC-2026-09',
                'patient_name' => 'Patient Stup Test',
                'prescriber_name' => 'Dr. Oncologue',
                'pharmacist_visa' => 'Dr. Titulaire Test',
            ]);
        $resSortie->assertCreated();

        // 3. Destruction officielle avec double signature (Tâche 2.2 / STU-07)
        $resDestruct = $this->actingAs($user)
            ->withHeaders(['X-Officine-ID' => (string) $officine->id])
            ->postJson('/api/v1/qualite/cdc-extras/stupefiants/destroy', [
                'entry_date' => '2026-11-13',
                'substance_name' => 'Morphine injectable 10mg',
                'lot_number' => 'LOT-MOR-01',
                'quantity' => 5,
                'unit' => 'Ampoules',
                'destruction_method' => 'Incinération en filière agréée DASRI',
                'titulaire_visa' => 'Dr. Titulaire Test',
                'witness_visa' => 'Dr. Pharmacien Adjoint Test',
                'witness_role' => 'Pharmacien Adjoint',
            ]);
        $resDestruct->assertCreated();
        $this->assertStringStartsWith('PV-DEST-', $resDestruct->json('pv_reference'));

        // 4. Calcul de la balance permanente sans repli silencieux
        $resBalance = $this->actingAs($user)
            ->withHeaders(['X-Officine-ID' => (string) $officine->id])
            ->getJson('/api/v1/qualite/cdc-extras/stupefiants/balance');
        $resBalance->assertOk();
        $this->assertEquals(100.0, $resBalance->json('summary.total_entrees'));
        $this->assertEquals(20.0, $resBalance->json('summary.total_sorties'));
        $this->assertEquals(5.0, $resBalance->json('summary.total_destructions'));
        $this->assertEquals(75.0, $resBalance->json('summary.solde_global'));
    }

    public function test_preparations_magistrales_and_release_label_lifecycle(): void
    {
        $officine = Officine::create([
            'slug' => 'pharmacie-test-prep-' . uniqid(),
            'name' => 'Pharmacie Test Préparations',
            'status' => 'active',
            'devise' => 'XOF',
        ]);
        $user = $this->makeUserFor($officine);

        // 1. Enregistrement ordonnancier
        $resStore = $this->actingAs($user)
            ->withHeaders(['X-Officine-ID' => (string) $officine->id])
            ->postJson('/api/v1/qualite/cdc-extras/preparations', [
                'reference' => 'PREP-TEST-001',
                'formula_name' => 'Solution antiseptique de Dakin officinale',
                'patient_name' => 'Patient Chirurgical Test',
                'prescriber_name' => 'Dr. Chirurgien',
                'quantity_prepared' => '250ml',
                'expiry_date' => '2026-12-31',
            ]);
        $resStore->assertCreated();
        $prepId = (int) $resStore->json('data.id');
        $this->assertEquals('en_preparation', $resStore->json('data.status'));

        // 2. Contrôle libératoire et signature du pharmacien
        $resRelease = $this->actingAs($user)
            ->withHeaders(['X-Officine-ID' => (string) $officine->id])
            ->postJson("/api/v1/qualite/cdc-extras/preparations/{$prepId}/release", [
                'pharmacist_visa' => 'Dr. Titulaire Test',
                'posology_verified' => true,
                'organoleptic_check' => true,
                'packaging_compliant' => true,
            ]);
        $resRelease->assertOk();
        $this->assertEquals('delivree', $resRelease->json('data.status'));
        $this->assertNotEmpty($resRelease->json('control_hash'));

        // 3. Fiche étiquette réglementaire avec mentions obligatoires
        $resLabel = $this->actingAs($user)
            ->withHeaders(['X-Officine-ID' => (string) $officine->id])
            ->getJson("/api/v1/qualite/cdc-extras/preparations/{$prepId}/label");
        $resLabel->assertOk();
        $this->assertEquals('PREP-TEST-001', $resLabel->json('data.reference'));
        $this->assertNotEmpty($resLabel->json('data.regulatory_mentions'));
        $this->assertNotEmpty($resLabel->json('data.control_hash'));
    }

    public function test_quarantined_or_recalled_lot_blocks_fefo_sale_and_triggers_capa(): void
    {
        $officine = Officine::create([
            'slug' => 'pharmacie-test-fefo-' . uniqid(),
            'name' => 'Pharmacie Test FEFO',
            'status' => 'active',
            'devise' => 'XOF',
        ]);
        $user = $this->makeUserFor($officine);

        $product = Product::create([
            'officine_id' => $officine->id,
            'code' => 'PROD-PARAC-TEST',
            'name' => 'Paracétamol 500mg Comprimés',
            'category' => 'Antalgique',
            'base_unit' => 'Boîte',
            'is_active' => true,
            'is_sellable' => true,
            'min_stock_threshold' => 10,
        ]);

        $lot = Lot::create([
            'officine_id' => $officine->id,
            'product_id' => $product->id,
            'batch_number' => 'LOT-RECALL-TEST',
            'expiry_date' => '2027-12-31',
            'initial_qty' => 50,
            'available_qty' => 50,
            'status' => 'disponible',
            'is_sellable' => true,
        ]);

        // Mise en rappel (STO-14)
        $resRecall = $this->actingAs($user)
            ->withHeaders(['X-Officine-ID' => (string) $officine->id])
            ->postJson("/api/v1/stock/lots/{$lot->id}/quarantine", [
                'event_type' => 'rappel',
                'reason' => 'Avis de rappel sanitaire ABRP pour sous-dosage avéré.',
            ]);
        $resRecall->assertCreated();

        // Le lot est immédiatement bloqué
        $lot->refresh();
        $this->assertEquals('rappele', $lot->status);
        $this->assertFalse($lot->is_sellable);

        // Tentative de sortie commerciale bloquée
        $resVente = $this->actingAs($user)
            ->withHeaders(['X-Officine-ID' => (string) $officine->id])
            ->postJson('/api/v1/stock/movements', [
                'lot_id' => $lot->id,
                'movement_type' => 'vente',
                'quantity' => 1,
                'reason' => 'Vente interdite lot rappelé',
            ]);
        $resVente->assertStatus(422);
        $this->assertStringContainsString('bloqué', $resVente->json('message'));
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RemainingCdcScreensTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $limitedMember;
    private Officine $office;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Admin CDC Extras',
            'email' => 'admin-cdc@example.test',
            'password' => 'Fictional12345',
        ]);
        $this->limitedMember = User::create([
            'name' => 'Membre Limité CDC',
            'email' => 'limited-cdc@example.test',
            'password' => 'Fictional12345',
        ]);
        $this->office = Officine::create([
            'name' => 'Pharmacie CDC Complet',
            'slug' => 'pharmacie-cdc-complet',
            'status' => 'active',
        ]);

        DB::table('officine_user')->insert([
            [
                'user_id' => $this->admin->id,
                'officine_id' => $this->office->id,
                'is_admin' => true,
                'is_active' => true,
                'permissions' => '[]',
            ],
            [
                'user_id' => $this->limitedMember->id,
                'officine_id' => $this->office->id,
                'is_admin' => false,
                'is_active' => true,
                'permissions' => '[]',
            ],
        ]);
        DB::table('officine_modules')->insert([
            ['officine_id' => $this->office->id, 'module' => 'qualite', 'is_active' => true],
        ]);

        Sanctum::actingAs($this->admin);
        $this->withHeaders(['X-Officine-ID' => (string) $this->office->id]);
    }

    public function test_rbac_strict_and_all_six_remaining_cdc_workflows(): void
    {
        Sanctum::actingAs($this->limitedMember);
        $this->withHeaders(['X-Officine-ID' => (string) $this->office->id])
            ->getJson('/api/v1/qualite/cdc-extras/stupefiants')
            ->assertForbidden();

        Sanctum::actingAs($this->admin);

        // 1. Stupéfiants Tab. B (SHA-256)
        $stup = $this->postJson('/api/v1/qualite/cdc-extras/stupefiants', [
            'entry_date' => '2026-11-12',
            'movement_type' => 'sortie',
            'substance_name' => 'Morphine Sulfate 10mg',
            'lot_number' => 'LOT-STUP-01',
            'quantity' => 2,
            'prescription_ref' => 'ORD-TABB-99',
        ])->assertCreated();
        $this->assertEquals(64, strlen((string) $stup->json('data.entry_hash')));

        // 2. Préparations Magistrales
        $prep = $this->postJson('/api/v1/qualite/cdc-extras/preparations', [
            'reference' => 'PREP-2026-01',
            'formula_name' => 'Pommade dermatologique magistrale',
            'quantity_prepared' => '50g',
            'expiry_date' => '2026-12-31',
        ])->assertCreated();
        $this->postJson("/api/v1/qualite/cdc-extras/preparations/{$prep->json('data.id')}/release")
            ->assertOk()
            ->assertJsonPath('data.status', 'delivree');

        // 3. Modèles Types BPD (59)
        $boot = $this->postJson('/api/v1/qualite/cdc-extras/bpd-models/bootstrap')->assertCreated();
        $this->assertEquals(59, $boot->json('created'));
        $models = $this->getJson('/api/v1/qualite/cdc-extras/bpd-models')->assertOk();
        $this->assertCount(59, $models->json('data'));
        $firstModelId = $models->json('data.0.id');
        $this->postJson("/api/v1/qualite/cdc-extras/bpd-models/{$firstModelId}/adopt")
            ->assertOk()
            ->assertJsonPath('data.is_adopted', true);

        // 4. Auto-évaluation 267 Arts
        $eval = $this->postJson('/api/v1/qualite/cdc-extras/autoeval', [
            'reference' => 'AUTO-2026-T4',
            'title' => 'Campagne Q4 2026',
            'total_articles' => 267,
            'compliant_count' => 240,
            'non_compliant_count' => 27,
        ])->assertCreated();
        $this->assertEquals('cloturee', $eval->json('data.status'));

        // 5. Pointage Présence Art 1.11
        $this->postJson('/api/v1/qualite/cdc-extras/presence', [
            'staff_name' => 'Dr. Kossi Titulaire',
            'role_badge' => 'Pharmacien Titulaire',
            'work_date' => '2026-11-12',
            'check_in_at' => '08:00',
            'pharmacist_present' => true,
        ])->assertCreated();

        // 6. Échéancier réglementaire
        $dl = $this->postJson('/api/v1/qualite/cdc-extras/deadlines', [
            'reference' => 'ECH-2026-11',
            'title' => 'Déclaration mensuelle TVA & ITS',
            'authority' => 'DGI',
            'due_date' => '2026-11-15',
        ])->assertCreated();
        $this->postJson("/api/v1/qualite/cdc-extras/deadlines/{$dl->json('data.id')}/close", [
            'proof_ref' => 'QUIT-DGI-1122',
        ])->assertOk()->assertJsonPath('data.status', 'cloturee');
    }
}

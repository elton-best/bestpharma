<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Comptabilite\Models\ComptaCompte;
use App\Modules\Comptabilite\Models\ComptaEcriture;
use App\Modules\Comptabilite\Models\ComptaExercice;
use App\Modules\Comptabilite\Models\ComptaJournal;
use App\Modules\Dispensation\Models\Sale;
use App\Modules\Tenancy\Models\Officine;
use App\Modules\Tresorerie\Models\ExpenseRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Module16ComptabiliteSyscohadaTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $limitedMember;
    private Officine $office;
    private Officine $otherOffice;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Admin Compta M16',
            'email' => 'admin-compta@example.test',
            'password' => 'Fictional12345',
        ]);
        $this->limitedMember = User::create([
            'name' => 'Membre Sans Droit Compta',
            'email' => 'limited-compta@example.test',
            'password' => 'Fictional12345',
        ]);

        $this->office = Officine::create([
            'name' => 'Pharmacie Compta SYSCOHADA',
            'slug' => 'pharmacie-compta-syscohada',
            'status' => 'active',
        ]);
        $this->otherOffice = Officine::create([
            'name' => 'Pharmacie Voisine',
            'slug' => 'pharmacie-voisine-compta',
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
            ['officine_id' => $this->office->id, 'module' => 'comptabilite', 'is_active' => true],
        ]);

        Sanctum::actingAs($this->admin);
        $this->withHeaders(['X-Officine-ID' => (string) $this->office->id]);
    }

    public function test_rbac_strict_and_bootstrap_syscohada_idempotent(): void
    {
        Sanctum::actingAs($this->limitedMember);
        $this->withHeaders(['X-Officine-ID' => (string) $this->office->id])
            ->getJson('/api/v1/comptabilite/overview')
            ->assertForbidden();

        Sanctum::actingAs($this->admin);
        $b1 = $this->postJson('/api/v1/comptabilite/bootstrap');
        $b1->assertCreated();
        $this->assertEquals(13, $b1->json('data.accounts_created'));
        $this->assertEquals(5, $b1->json('data.journals_created'));

        // Idempotent au 2e appel
        $b2 = $this->postJson('/api/v1/comptabilite/bootstrap');
        $b2->assertCreated();
        $this->assertEquals(0, $b2->json('data.accounts_created'));
        $this->assertEquals(0, $b2->json('data.journals_created'));

        $this->getJson('/api/v1/comptabilite/overview')
            ->assertOk()
            ->assertJsonPath('kpis.comptes_actifs', 13)
            ->assertJsonPath('kpis.journaux_actifs', 5)
            ->assertJsonPath('kpis.exercices_ouverts', 1)
            ->assertJsonPath('kpis.equilibre_general', true);
    }

    public function test_double_entry_balance_sha256_sealing_and_cross_tenant_guards(): void
    {
        $this->postJson('/api/v1/comptabilite/bootstrap')->assertCreated();

        $exercice = ComptaExercice::where('officine_id', $this->office->id)->firstOrFail();
        $journalOd = ComptaJournal::where('officine_id', $this->office->id)->where('code', 'OD')->firstOrFail();
        $compteBanque = ComptaCompte::where('officine_id', $this->office->id)->where('code', '521000')->firstOrFail();
        $compteCapital = ComptaCompte::where('officine_id', $this->office->id)->where('code', '101000')->firstOrFail();

        $foreignExercice = ComptaExercice::create([
            'officine_id' => $this->otherOffice->id,
            'code' => 'EX-OTHER',
            'label' => 'Exercice Voisine',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'ouvert',
            'version' => 1,
        ]);

        // Cross-tenant exercice_id -> 404
        $this->postJson('/api/v1/comptabilite/ecritures', [
            'exercice_id' => $foreignExercice->id,
            'journal_id' => $journalOd->id,
            'reference' => 'EC-XT-01',
            'entry_date' => now()->toDateString(),
            'label' => 'Test cross tenant',
            'lignes' => [
                ['compte_id' => $compteBanque->id, 'label' => 'D', 'debit' => 1000, 'credit' => 0],
                ['compte_id' => $compteCapital->id, 'label' => 'C', 'debit' => 0, 'credit' => 1000],
            ],
        ])->assertNotFound();

        // Écriture déséquilibrée -> 422
        $this->postJson('/api/v1/comptabilite/ecritures', [
            'exercice_id' => $exercice->id,
            'journal_id' => $journalOd->id,
            'reference' => 'EC-UNBAL-01',
            'entry_date' => now()->toDateString(),
            'label' => 'Écriture déséquilibrée',
            'lignes' => [
                ['compte_id' => $compteBanque->id, 'label' => 'D', 'debit' => 50000, 'credit' => 0],
                ['compte_id' => $compteCapital->id, 'label' => 'C', 'debit' => 0, 'credit' => 45000],
            ],
        ])->assertStatus(422);

        // Écriture équilibrée + idempotency
        $payload = [
            'exercice_id' => $exercice->id,
            'journal_id' => $journalOd->id,
            'reference' => 'EC-CAP-01',
            'idempotency_key' => 'idem-cap-01',
            'entry_date' => now()->toDateString(),
            'label' => 'Apport initial en banque',
            'lignes' => [
                ['compte_id' => $compteBanque->id, 'label' => 'Dépôt banque', 'debit' => 500000, 'credit' => 0],
                ['compte_id' => $compteCapital->id, 'label' => 'Capital social', 'debit' => 0, 'credit' => 500000],
            ],
        ];
        $e1 = $this->postJson('/api/v1/comptabilite/ecritures', $payload)->assertCreated();
        $ecritureId = $e1->json('data.id');
        $this->postJson('/api/v1/comptabilite/ecritures', $payload)
            ->assertOk()
            ->assertJsonPath('replayed', true);

        // Clôture impossible tant qu'un brouillon subsiste -> 422
        $this->postJson("/api/v1/comptabilite/exercices/{$exercice->id}/close")->assertStatus(422);

        // Validation & scellement SHA-256
        $val = $this->postJson("/api/v1/comptabilite/ecritures/{$ecritureId}/validate")->assertOk();
        $this->assertEquals('validee', $val->json('data.status'));
        $this->assertEquals(64, strlen((string) $val->json('data.entry_hash')));

        // Grand-livre & Balance générale
        $gl = $this->getJson('/api/v1/comptabilite/grand-livre')->assertOk();
        $this->assertCount(2, $gl->json('data'));

        $bal = $this->getJson('/api/v1/comptabilite/balance')->assertOk();
        $this->assertTrue($bal->json('data.totals.is_balanced'));
        $this->assertEquals(500000, $bal->json('data.totals.total_debit'));
        $this->assertEquals(500000, $bal->json('data.totals.total_credit'));

        // Clôture possible une fois toutes les écritures validées
        $this->postJson("/api/v1/comptabilite/exercices/{$exercice->id}/close")
            ->assertOk()
            ->assertJsonPath('data.status', 'cloture');
    }

    public function test_sync_from_operations_is_idempotent_and_balanced(): void
    {
        Sale::create([
            'officine_id' => $this->office->id,
            'reference' => 'VTE-COMPTA-01',
            'sale_type' => 'libre',
            'status' => 'payee',
            'total_amount' => 12500,
            'paid_amount' => 12500,
            'cashier_user_id' => $this->admin->id,
            'confirmed_at' => now(),
            'version' => 1,
        ]);

        ExpenseRequest::create([
            'officine_id' => $this->office->id,
            'reference' => 'DEP-COMPTA-01',
            'category' => 'fournitures',
            'amount' => 3500,
            'reason' => 'Papeterie officine',
            'status' => 'decaissee',
            'requested_by_user_id' => $this->admin->id,
            'disbursed_at' => now(),
            'version' => 1,
        ]);

        $s1 = $this->postJson('/api/v1/comptabilite/sync-operations')->assertOk();
        $this->assertEquals(1, $s1->json('data.sales_synced'));
        $this->assertEquals(1, $s1->json('data.expenses_synced'));

        // 2e sync -> 0 doublon
        $s2 = $this->postJson('/api/v1/comptabilite/sync-operations')->assertOk();
        $this->assertEquals(0, $s2->json('data.sales_synced'));
        $this->assertEquals(0, $s2->json('data.expenses_synced'));
        $this->assertEquals(2, ComptaEcriture::where('officine_id', $this->office->id)->count());

        $bal = $this->getJson('/api/v1/comptabilite/balance')->assertOk();
        $this->assertTrue($bal->json('data.totals.is_balanced'));
        $this->assertEquals(16000, $bal->json('data.totals.total_debit'));
    }
}

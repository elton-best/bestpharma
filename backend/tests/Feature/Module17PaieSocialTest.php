<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Paie\Models\PaieBulletin;
use App\Modules\Personnel\Models\Employee;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Module17PaieSocialTest extends TestCase
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
            'name' => 'Admin Paie M17',
            'email' => 'admin-paie@example.test',
            'password' => 'Fictional12345',
        ]);
        $this->limitedMember = User::create([
            'name' => 'Membre Sans Droit Paie',
            'email' => 'limited-paie@example.test',
            'password' => 'Fictional12345',
        ]);

        $this->office = Officine::create([
            'name' => 'Pharmacie Paie Bénin',
            'slug' => 'pharmacie-paie-benin',
            'status' => 'active',
        ]);
        $this->otherOffice = Officine::create([
            'name' => 'Pharmacie Voisine Paie',
            'slug' => 'pharmacie-voisine-paie',
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
            ['officine_id' => $this->office->id, 'module' => 'paie', 'is_active' => true],
        ]);

        Sanctum::actingAs($this->admin);
        $this->withHeaders(['X-Officine-ID' => (string) $this->office->id]);
    }

    public function test_rbac_strict_and_cross_tenant_employee_guard(): void
    {
        Sanctum::actingAs($this->limitedMember);
        $this->withHeaders(['X-Officine-ID' => (string) $this->office->id])
            ->getJson('/api/v1/paie/overview')
            ->assertForbidden();

        Sanctum::actingAs($this->admin);
        $foreignEmp = Employee::create([
            'officine_id' => $this->otherOffice->id,
            'matricule' => 'EMP-B-01',
            'first_name' => 'Jean',
            'last_name' => 'Autre',
            'role_title' => 'Préparateur',
            'contract_type' => 'CDI',
            'hire_date' => '2025-01-15',
            'status' => 'actif',
            'version' => 1,
        ]);

        $this->postJson('/api/v1/paie/variables', [
            'employee_id' => $foreignEmp->id,
            'period_month' => '2026-11',
            'base_salary' => 150000,
        ])->assertNotFound();
    }

    public function test_full_payroll_lifecycle_calculation_idempotency_and_declarations(): void
    {
        $this->postJson('/api/v1/paie/bootstrap-bareme')->assertCreated();

        $emp = Employee::create([
            'officine_id' => $this->office->id,
            'matricule' => 'EMP-BJ-001',
            'first_name' => 'Amina',
            'last_name' => 'Kossi',
            'role_title' => 'Pharmacien Assistant',
            'contract_type' => 'CDI',
            'hire_date' => '2025-01-15',
            'status' => 'actif',
            'version' => 1,
        ]);

        // 200000 + 20000 primes + (4h * 2000 * 1.25 = 10000) - 5000 absences = 225000 brut
        $this->postJson('/api/v1/paie/variables', [
            'employee_id' => $emp->id,
            'period_month' => '2026-11',
            'base_salary' => 200000,
            'primes' => 20000,
            'overtime_hours' => 4,
            'overtime_hourly_rate' => 2000,
            'absences_deduction' => 5000,
        ])->assertCreated();

        $genPayload = [
            'employee_id' => $emp->id,
            'period_month' => '2026-11',
            'idempotency_key' => 'bp-2026-11-e1',
        ];
        $b1 = $this->postJson('/api/v1/paie/bulletins/generate', $genPayload)->assertCreated();
        $bulletinId = $b1->json('data.id');

        // Vérification calcul barème BJ 2026 :
        // Brut = 225000; CNSS sal (3.6%) = 8100; CNSS pat (16.4%) = 36900;
        // Imposable = 225000 - 8100 = 216900; ITS (10%) = 21690; Net = 225000 - 8100 - 21690 = 195210
        $this->assertEquals(225000, $b1->json('data.gross_salary'));
        $this->assertEquals(8100, $b1->json('data.cnss_employee'));
        $this->assertEquals(36900, $b1->json('data.cnss_employer'));
        $this->assertEquals(21690, $b1->json('data.its_tax'));
        $this->assertEquals(195210, $b1->json('data.net_salary'));

        // Idempotence au rejeu
        $this->postJson('/api/v1/paie/bulletins/generate', $genPayload)
            ->assertOk()
            ->assertJsonPath('replayed', true);
        $this->assertEquals(1, PaieBulletin::where('officine_id', $this->office->id)->count());

        // Paiement refusé avant validation -> 422
        $this->postJson("/api/v1/paie/bulletins/{$bulletinId}/pay")->assertStatus(422);

        // Validation SHA-256
        $val = $this->postJson("/api/v1/paie/bulletins/{$bulletinId}/validate")->assertOk();
        $this->assertEquals('valide', $val->json('data.status'));
        $this->assertEquals(64, strlen((string) $val->json('data.bulletin_hash')));

        // Déclarations CNSS & ITS
        $decl = $this->getJson('/api/v1/paie/declarations?period_month=2026-11')->assertOk();
        $this->assertEquals(45000, $decl->json('data.0.total_cnss_due')); // 8100 + 36900
        $this->assertEquals(21690, $decl->json('data.0.total_its'));

        // Paiement confirmé
        $this->postJson("/api/v1/paie/bulletins/{$bulletinId}/pay")
            ->assertOk()
            ->assertJsonPath('data.status', 'paye');

        $this->getJson('/api/v1/paie/overview')
            ->assertOk()
            ->assertJsonPath('kpis.bulletins_valides', 1)
            ->assertJsonPath('kpis.masse_nette_validee', 195210);
    }
}

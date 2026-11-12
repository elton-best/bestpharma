<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Achats\Models\Supplier;
use App\Modules\Reporting\Models\ReportTemplate;
use App\Modules\Stock\Models\Product;
use App\Modules\Tenancy\Models\Officine;
use App\Modules\Tresorerie\Models\CashRegister;
use App\Modules\Tresorerie\Models\CashSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SecurityAuditRegressionTest extends TestCase
{
    use RefreshDatabase;

    private User $limitedMember;
    private User $adminA;
    private Officine $officeA;
    private Officine $officeB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->limitedMember = User::create([
            'name' => 'Membre Sans Droits',
            'email' => 'limited-sec@example.test',
            'password' => 'Fictional12345',
        ]);
        $this->adminA = User::create([
            'name' => 'Admin Officine A',
            'email' => 'admin-a-sec@example.test',
            'password' => 'Fictional12345',
        ]);

        $this->officeA = Officine::create([
            'name' => 'Pharmacie A Sec',
            'slug' => 'pharmacie-a-sec',
            'status' => 'active',
        ]);
        $this->officeB = Officine::create([
            'name' => 'Pharmacie B Sec',
            'slug' => 'pharmacie-b-sec',
            'status' => 'active',
        ]);

        DB::table('officine_user')->insert([
            [
                'user_id' => $this->limitedMember->id,
                'officine_id' => $this->officeA->id,
                'is_admin' => false,
                'is_active' => true,
                'permissions' => '[]',
            ],
            [
                'user_id' => $this->adminA->id,
                'officine_id' => $this->officeA->id,
                'is_admin' => true,
                'is_active' => true,
                'permissions' => '[]',
            ],
        ]);

        foreach (['qualite', 'personnel', 'locauxequipements', 'achats', 'stock', 'dispensation', 'tresorerie', 'reporting', 'platformadmin'] as $mod) {
            DB::table('officine_modules')->insert([
                'officine_id' => $this->officeA->id,
                'module' => $mod,
                'is_active' => true,
            ]);
        }
    }

    public function test_non_admin_member_with_empty_permissions_is_forbidden_across_modules_5_to_15(): void
    {
        Sanctum::actingAs($this->limitedMember);

        $endpoints = [
            '/api/v1/qualite/inspections/overview',
            '/api/v1/qualite/nonconformites/overview',
            '/api/v1/qualite/risques/overview',
            '/api/v1/personnel/overview',
            '/api/v1/locauxequipements/overview',
            '/api/v1/achats/overview',
            '/api/v1/stock/overview',
            '/api/v1/dispensation/overview',
            '/api/v1/tresorerie/overview',
            '/api/v1/reporting/overview',
            '/api/v1/platformadmin/overview',
        ];

        foreach ($endpoints as $endpoint) {
            $this->withHeaders(['X-Officine-ID' => (string) $this->officeA->id])
                ->getJson($endpoint)
                ->assertForbidden();
        }
    }

    public function test_cross_tenant_foreign_ids_are_rejected_across_modules_10_to_14(): void
    {
        $foreignSupplier = Supplier::create([
            'officine_id' => $this->officeB->id,
            'code' => 'SUP-B-01',
            'name' => 'Fournisseur Officine B',
            'category' => 'grossiste_repartiteur',
            'status' => 'qualifie',
            'version' => 1,
        ]);

        $foreignProduct = Product::create([
            'officine_id' => $this->officeB->id,
            'code' => 'PROD-B-01',
            'name' => 'Produit Officine B',
            'version' => 1,
        ]);

        $foreignRegister = CashRegister::create([
            'officine_id' => $this->officeB->id,
            'code' => 'REG-B-01',
            'name' => 'Caisse B',
            'discrepancy_alert_threshold' => 1000,
        ]);

        $foreignSession = CashSession::create([
            'officine_id' => $this->officeB->id,
            'cash_register_id' => $foreignRegister->id,
            'session_ref' => 'SESS-B-01',
            'cashier_user_id' => $this->adminA->id,
            'opened_at' => now(),
            'opening_balance' => 10000,
            'expected_closing_balance' => 10000,
            'status' => 'ouverte',
            'version' => 1,
        ]);

        $foreignTemplate = ReportTemplate::create([
            'officine_id' => $this->officeB->id,
            'code' => 'TPL-B-01',
            'title' => 'Modèle Officine B',
            'category' => 'exploitation',
            'metric_codes' => ['sales_total'],
            'version' => 1,
        ]);

        Sanctum::actingAs($this->adminA);
        $headers = ['X-Officine-ID' => (string) $this->officeA->id];

        // M10 : supplier_id d'une autre officine -> 404
        $this->withHeaders($headers)->postJson('/api/v1/achats/contracts', [
            'supplier_id' => $foreignSupplier->id,
            'contract_ref' => 'CTR-X-01',
            'title' => 'Contrat Cross-Tenant',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addYear()->toDateString(),
        ])->assertNotFound();

        // M11 : default_supplier_id d'une autre officine -> 404
        $this->withHeaders($headers)->postJson('/api/v1/stock/products', [
            'code' => 'PROD-X-01',
            'name' => 'Produit Cross-Tenant',
            'default_supplier_id' => $foreignSupplier->id,
        ])->assertNotFound();

        // M12 : product_id d'une autre officine -> 404
        $this->withHeaders($headers)->postJson('/api/v1/dispensation/safety-reports', [
            'reference' => 'SIG-X-01',
            'product_id' => $foreignProduct->id,
            'report_type' => 'defaut_qualite',
            'description' => 'Signalement cross-tenant test',
        ])->assertNotFound();

        // M13 : cash_session_id d'une autre officine -> 404
        $this->withHeaders($headers)->postJson('/api/v1/tresorerie/expenses', [
            'cash_session_id' => $foreignSession->id,
            'reference' => 'DEP-X-01',
            'category' => 'fournitures',
            'amount' => 5000,
            'reason' => 'Dépense cross-tenant',
        ])->assertNotFound();

        // M14 : template_id d'une autre officine -> 404
        $this->withHeaders($headers)->postJson('/api/v1/reporting/runs', [
            'template_id' => $foreignTemplate->id,
            'reference' => 'RUN-X-01',
            'title' => 'Rapport cross-tenant',
            'period_start' => now()->startOfMonth()->toDateString(),
            'period_end' => now()->toDateString(),
        ])->assertNotFound();
    }
}

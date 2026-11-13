<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Dispensation\Controllers\Module12DispensationVenteController;
use App\Modules\Personnel\Controllers\Module8PersonnelFormationController;
use App\Modules\Stock\Controllers\Module11ProduitStockController;
use App\Modules\Stock\Models\Lot;
use App\Modules\Stock\Models\Product;
use App\Modules\Tenancy\Models\Officine;
use App\Modules\Tresorerie\Controllers\Module13CaisseFinancesController;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BusinessModulePermissionsTest extends TestCase
{
    use RefreshDatabase;

    private User $member;
    private Officine $office;
    private const MODULES = ['personnel', 'stock', 'dispensation', 'tresorerie'];
    private const CONTROLLERS = [
        Module8PersonnelFormationController::class,
        Module11ProduitStockController::class,
        Module12DispensationVenteController::class,
        Module13CaisseFinancesController::class,
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->member = User::create([
            'name' => 'Membre métier', 'email' => 'business-permissions@example.test', 'password' => 'Fictional12345',
        ]);
        $this->office = Officine::create([
            'name' => 'Officine permissions', 'slug' => 'business-permissions', 'status' => 'active',
        ]);
        DB::table('officine_user')->insert([
            'user_id' => $this->member->id, 'officine_id' => $this->office->id,
            'is_admin' => false, 'is_active' => true, 'permissions' => '[]',
        ]);
        foreach (array_merge(['qualite'], self::MODULES) as $module) {
            DB::table('officine_modules')->insert([
                'officine_id' => $this->office->id, 'module' => $module, 'is_active' => true,
            ]);
        }
        Sanctum::actingAs($this->member);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    private function permissions(array $permissions, bool $isAdmin = false): void
    {
        DB::table('officine_user')->where('user_id', $this->member->id)->where('officine_id', $this->office->id)
            ->update(['permissions' => json_encode($permissions), 'is_admin' => $isAdmin]);
    }

    private function bases(string $module): array
    {
        return ['/api/v1/'.$module, '/api/v1/qualite/'.$module];
    }

    public function test_quality_permissions_are_rejected_on_every_business_controller_route(): void
    {
        $this->permissions(['qualite.read', 'qualite.write']);
        $seen = [];
        foreach (app('router')->getRoutes() as $route) {
            $controller = explode('@', $route->getActionName())[0];
            if (!in_array($controller, self::CONTROLLERS, true)) {
                continue;
            }
            $uri = '/'.preg_replace('/\{[^}]+\}/', '1', $route->uri());
            $method = $route->methods()[0];
            // Keep throttling enabled; each authorization probe uses a fresh time window.
            $this->travel(1)->minutes();
            $this->json($method, $uri)->assertForbidden();
            $seen[$controller][$uri] = true;
        }
        foreach (self::CONTROLLERS as $controller) {
            $this->assertGreaterThan(10, count($seen[$controller] ?? []), $controller);
        }
    }

    public function test_read_permissions_are_module_specific_and_do_not_allow_writes(): void
    {
        $createPaths = ['personnel' => 'employees', 'stock' => 'products', 'dispensation' => 'sales', 'tresorerie' => 'registers'];
        foreach (self::MODULES as $allowed) {
            $this->travel(1)->minutes();
            $this->permissions([$allowed.'.read']);
            foreach (self::MODULES as $module) {
                foreach ($this->bases($module) as $base) {
                    $response = $this->getJson($base.'/overview');
                    $allowed === $module ? $response->assertOk() : $response->assertForbidden();
                    $this->postJson($base.'/'.$createPaths[$module])->assertForbidden();
                }
            }
        }
    }

    public function test_write_permissions_do_not_imply_read_permissions(): void
    {
        foreach (self::MODULES as $module) {
            $this->permissions([$module.'.write']);
            foreach ($this->bases($module) as $base) {
                $this->getJson($base.'/overview')->assertForbidden();
            }
        }
    }

    public function test_verified_office_admin_keeps_access_but_admin_permission_string_does_not_elevate(): void
    {
        foreach ([false, true] as $isAdmin) {
            $this->permissions(['admin'], $isAdmin);
            foreach (self::MODULES as $module) {
                foreach ($this->bases($module) as $base) {
                    $response = $this->getJson($base.'/overview');
                    $isAdmin ? $response->assertOk() : $response->assertForbidden();
                }
            }
        }
    }

    public function test_office_admin_access_still_requires_privileged_mfa_enrollment(): void
    {
        config(['socle.require_privileged_mfa' => true]);
        $this->permissions([], true);
        foreach (self::MODULES as $module) {
            foreach ($this->bases($module) as $base) {
                $this->getJson($base.'/overview')->assertForbidden()
                    ->assertJsonPath('code', 'mfa_enrollment_required');
            }
        }
    }

    public function test_cashier_can_only_list_create_and_confirm_sales_not_review_returns_or_safety(): void
    {
        $product = Product::create([
            'officine_id' => $this->office->id, 'code' => 'CASHIER-PRODUCT', 'name' => 'Produit test', 'selling_price' => 100,
        ]);
        $lot = Lot::create([
            'officine_id' => $this->office->id, 'product_id' => $product->id, 'batch_number' => 'CASHIER-LOT',
            'expiry_date' => now()->addYear()->toDateString(), 'initial_qty' => 10, 'available_qty' => 10,
            'status' => 'disponible', 'is_sellable' => true,
        ]);
        $this->permissions(['caisse.sell']);
        foreach ($this->bases('dispensation') as $index => $base) {
            $saleId = $this->postJson($base.'/sales', [
                'reference' => 'CASHIER-SALE-'.$index,
                'lines' => [['product_id' => $product->id, 'quantity' => 1]],
            ])->assertCreated()->json('data.id');
            $this->getJson($base.'/sales')->assertOk();
            $this->postJson($base.'/sales/'.$saleId.'/review', ['decision' => 'approuve'])->assertForbidden();
            $this->postJson($base.'/sales/'.$saleId.'/confirm', [
                'payment_status' => 'confirme', 'payment_method' => 'especes',
            ])->assertOk()->assertJsonPath('stock_decremented', true);
            foreach (['overview', 'returns', 'credits', 'safety-reports'] as $path) {
                $this->getJson($base.'/'.$path)->assertForbidden();
            }
            $this->postJson($base.'/returns', [
                'reference' => 'CASHIER-RETURN-'.$index, 'sale_id' => $saleId, 'product_id' => $product->id,
                'lot_id' => $lot->id, 'quantity_returned' => 1, 'reason' => 'Retour test',
            ])->assertForbidden();
            $this->postJson($base.'/returns/1/evaluate', ['pharmacist_decision' => 'quarantaine'])->assertForbidden();
            $this->postJson($base.'/safety-reports', [
                'reference' => 'CASHIER-SAFETY-'.$index, 'report_type' => 'defaut_qualite', 'description' => 'Test vigilance',
            ])->assertForbidden();
        }
        $this->assertSame(8, $lot->fresh()->available_qty);
        $this->assertDatabaseCount('pharmaceutical_reviews', 0);
        $this->assertDatabaseCount('returns', 0);
        $this->assertDatabaseCount('safety_reports', 0);
    }

    public function test_cashier_legacy_permissions_do_not_grant_treasury_administration(): void
    {
        foreach (['caisse.sell', 'caisse.session.manage'] as $permission) {
            $this->permissions([$permission]);
            foreach ($this->bases('tresorerie') as $base) {
                $this->getJson($base.'/overview')->assertForbidden();
                $this->postJson($base.'/registers')->assertForbidden();
                $this->postJson($base.'/expenses/1/decision', ['decision' => 'decaissee'])->assertForbidden();
            }
        }
    }

    public function test_disabled_real_module_is_rejected_on_direct_and_quality_alias_for_members_and_admins(): void
    {
        foreach ([false, true] as $isAdmin) {
            $this->permissions(array_map(fn ($module) => $module.'.read', self::MODULES), $isAdmin);
            foreach (self::MODULES as $module) {
                DB::table('officine_modules')->where('officine_id', $this->office->id)
                    ->where('module', $module)->update(['is_active' => false]);
                foreach ($this->bases($module) as $base) {
                    $this->getJson($base.'/overview')->assertForbidden()
                        ->assertJsonPath('message', 'Ce module n’est pas activé pour cette officine.');
                }
                DB::table('officine_modules')->where('officine_id', $this->office->id)
                    ->where('module', $module)->update(['is_active' => true]);
            }
        }
    }
}

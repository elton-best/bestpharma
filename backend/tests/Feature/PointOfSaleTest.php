<?php
namespace Tests\Feature;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PointOfSaleTest extends TestCase
{
    use RefreshDatabase;
    private User $user; private Officine $office; private int $product; private int $balance;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user=User::create(['name'=>'Caissier test','email'=>'cashier-pos@example.test','password'=>'Fictional12345']);
        $this->office=Officine::create(['name'=>'POS test','slug'=>'pos-test','status'=>'active']);
        DB::table('officine_user')->insert(['user_id'=>$this->user->id,'officine_id'=>$this->office->id,'is_active'=>true,'is_admin'=>true,'permissions'=>'[]']);
        DB::table('officine_modules')->insert(['officine_id'=>$this->office->id,'module'=>'ventescaisse','is_active'=>true]);
        Sanctum::actingAs($this->user);$this->withHeader('X-Officine-ID',(string)$this->office->id);
        $this->product=DB::table('stock_products')->insertGetId(['officine_id'=>$this->office->id,'name'=>'Produit test','code'=>'POS-TEST','unit'=>'boîte','threshold'=>0,'sale_price'=>1000,'created_at'=>now(),'updated_at'=>now()]);
        $batch=DB::table('stock_batches')->insertGetId(['officine_id'=>$this->office->id,'product_id'=>$this->product,'batch'=>'LOT-FEFO','expiry'=>now()->addYear()->toDateString(),'unit_cost'=>500,'status'=>'available','created_at'=>now(),'updated_at'=>now()]);
        $location=DB::table('stock_locations')->insertGetId(['officine_id'=>$this->office->id,'name'=>'Rayon','created_at'=>now(),'updated_at'=>now()]);
        $this->balance=DB::table('stock_balances')->insertGetId(['officine_id'=>$this->office->id,'batch_id'=>$batch,'location_id'=>$location,'quantity'=>5,'created_at'=>now(),'updated_at'=>now()]);
    }

    private function open(string $key='pos-session-open-request-01'): void { $this->postJson('/api/v1/ventescaisse/sessions',['opening_cash'=>10000,'request_key'=>$key])->assertCreated(); }
    private function sale(string $key='pos-idempotent-request-001',int $quantity=2)
    { return $this->postJson('/api/v1/ventescaisse/sales',['request_key'=>$key,'mode_reglement'=>'especes','montant_recu'=>5000,'lignes'=>[['product_id'=>$this->product,'quantite'=>$quantity]]]); }

    public function test_cash_sale_decrements_fefo_stock_and_replays_idempotently(): void
    {
        $this->open();$first=$this->sale()->assertCreated()->assertJsonPath('data.montant_net_ttc',2000)->assertJsonPath('data.monnaie_rendue',3000)->assertJsonPath('data.facture_emecef',null)->assertJsonPath('services_externes.facturation_fiscale','non_configuree');
        $this->sale()->assertOk()->assertJsonPath('replayed',true);
        $this->assertSame(3,(int)DB::table('stock_balances')->where('id',$this->balance)->value('quantity'));
        $this->assertDatabaseCount('pos_sales',1);$this->assertDatabaseCount('pos_sale_lines',1);
        $this->sale('pos-idempotent-request-001',1)->assertConflict();
        $this->assertFalse(Schema::hasTable('factures_emecef'));$this->assertFalse(Schema::hasTable('ecritures_syscohada'));
    }

    public function test_external_payment_or_insufficient_stock_creates_no_sale(): void
    {
        $this->postJson('/api/v1/ventescaisse/sales',['request_key'=>'mobile-payment-request-001','mode_reglement'=>'mobile_money','lignes'=>[['product_id'=>$this->product,'quantite'=>1]]])->assertStatus(503)->assertJsonPath('code','payment_provider_unavailable');
        $this->open();$this->sale('insufficient-stock-request-001',6)->assertUnprocessable();
        $this->assertDatabaseCount('pos_sales',0);$this->assertSame(5,(int)DB::table('stock_balances')->where('id',$this->balance)->value('quantity'));
    }

    public function test_sales_are_isolated_by_officine(): void
    {
        $other=Officine::create(['name'=>'Autre POS','slug'=>'pos-other','status'=>'active']);
        DB::table('officine_user')->insert(['user_id'=>$this->user->id,'officine_id'=>$other->id,'is_active'=>true,'is_admin'=>true,'permissions'=>'[]']);
        DB::table('officine_modules')->insert(['officine_id'=>$other->id,'module'=>'ventescaisse','is_active'=>true]);
        $this->withHeader('X-Officine-ID',(string)$other->id);$this->open();
        $this->sale('other-tenant-sale-request-01',1)->assertNotFound();
        $this->assertDatabaseCount('pos_sales',0);$this->assertSame(5,(int)DB::table('stock_balances')->where('id',$this->balance)->value('quantity'));
    }

    public function test_session_open_and_close_retries_are_idempotent_and_conflicts_are_rejected(): void
    {
        $payload=['opening_cash'=>10000,'request_key'=>'session-open-idempotency-01'];
        $first=$this->postJson('/api/v1/ventescaisse/sessions',$payload)->assertCreated()->json('data.id');
        $this->postJson('/api/v1/ventescaisse/sessions',$payload)->assertOk()->assertJsonPath('data.id',$first)->assertJsonPath('replayed',true);
        $this->postJson('/api/v1/ventescaisse/sessions',array_replace($payload,['opening_cash'=>5000]))->assertConflict();
        $session=DB::table('pos_sessions')->where('id',$first)->first();
        $close=['closing_cash'=>9000,'note'=>'Comptage','request_key'=>'session-close-idempotency-01'];
        $this->postJson("/api/v1/ventescaisse/sessions/{$first}/close",$close)->assertOk()->assertJsonPath('replayed',false);
        $this->postJson("/api/v1/ventescaisse/sessions/{$first}/close",$close)->assertOk()->assertJsonPath('replayed',true);
        $this->postJson("/api/v1/ventescaisse/sessions/{$first}/close",array_replace($close,['closing_cash'=>1]))->assertConflict();
        $this->assertSame('closed',DB::table('pos_sessions')->where('id',$session->id)->value('status'));
        $this->assertDatabaseCount('pos_sessions',1);
    }

    public function test_closed_session_cannot_be_closed_with_a_different_key_and_foreign_session_is_hidden(): void
    {
        $this->open();$id=(int)DB::table('pos_sessions')->value('id');
        $path="/api/v1/ventescaisse/sessions/{$id}/close";
        $this->postJson($path,['closing_cash'=>10000,'request_key'=>'session-close-original-01'])->assertOk();
        $this->postJson($path,['closing_cash'=>10000,'request_key'=>'session-close-another-key-01'])->assertConflict();
        $other=Officine::create(['name'=>'Autre POS session','slug'=>'pos-session-other','status'=>'active']);
        DB::table('officine_user')->insert(['user_id'=>$this->user->id,'officine_id'=>$other->id,'is_active'=>true,'is_admin'=>true,'permissions'=>'[]']);
        DB::table('officine_modules')->insert(['officine_id'=>$other->id,'module'=>'ventescaisse','is_active'=>true]);
        $this->withHeader('X-Officine-ID',(string)$other->id)->postJson($path,['closing_cash'=>10000,'request_key'=>'session-close-foreign-01'])->assertNotFound();
    }

    public function test_sales_journal_is_paginated_and_cash_movements_are_audited_and_counted_at_close(): void
    {
        $this->open();
        $id=(int)DB::table('pos_sessions')->where('officine_id',$this->office->id)->value('id');
        $this->sale('pos-journal-request-key-01',1)->assertCreated();
        $this->getJson('/api/v1/ventescaisse/sales?per_page=1')->assertOk()->assertJsonPath('total',1)->assertJsonPath('data.0.total',1000);
        $this->postJson('/api/v1/ventescaisse/cash-movements',['direction'=>'entree','category'=>'apport','reason'=>'Fond complémentaire','amount'=>500])->assertCreated();
        $this->postJson('/api/v1/ventescaisse/cash-movements',['direction'=>'sortie','category'=>'depense','reason'=>'Achat urgence','amount'=>200])->assertCreated();
        $this->getJson('/api/v1/ventescaisse/cash-movements')->assertOk()->assertJsonPath('total',2);
        $this->assertDatabaseCount('tenant_audit_logs',2);
        $this->postJson("/api/v1/ventescaisse/sessions/{$id}/close",['closing_cash'=>11300,'request_key'=>'pos-movement-close-key-01'])->assertOk()->assertJsonPath('data.cash_difference',0);
    }

    public function test_cash_movement_rejects_invalid_category_and_requires_open_session(): void
    {
        $payload=['direction'=>'entree','category'=>'depense','reason'=>'Motif valide','amount'=>100];
        $this->postJson('/api/v1/ventescaisse/cash-movements',$payload)->assertStatus(422);
        $this->open();
        $this->postJson('/api/v1/ventescaisse/cash-movements',$payload)->assertStatus(422);
        $this->assertDatabaseCount('pos_cash_movements',0);
    }

    public function test_cash_actions_require_explicit_officine_role_permissions(): void
    {
        $membership=DB::table('officine_user')->where('officine_id',$this->office->id)->where('user_id',$this->user->id)->first();
        DB::table('officine_user')->where('id',$membership->id)->update(['is_admin'=>false]);
        $this->getJson('/api/v1/ventescaisse/catalog')->assertForbidden();
        $this->postJson('/api/v1/ventescaisse/sessions',['opening_cash'=>1000,'request_key'=>'unauthorized-session-key-01'])->assertForbidden();
        $this->postJson('/api/v1/ventescaisse/sales',['request_key'=>'unauthorized-sale-key-0001','mode_reglement'=>'especes','montant_recu'=>1000,'lignes'=>[['product_id'=>$this->product,'quantite'=>1]]])->assertForbidden();

        $role=DB::table('officine_roles')->insertGetId(['officine_id'=>$this->office->id,'name'=>'Équipe caisse','description'=>'Droits explicites caisse','permissions'=>json_encode(['caisse.read','caisse.sell','caisse.session.manage','caisse.mouvements.write']),'is_active'=>true,'version'=>1,'created_at'=>now(),'updated_at'=>now()]);
        DB::table('officine_member_roles')->insert(['membership_id'=>$membership->id,'role_id'=>$role]);
        $this->getJson('/api/v1/ventescaisse/catalog')->assertOk();
        $this->getJson('/api/v1/ventescaisse/sessions/active')->assertOk()->assertJsonPath('can_sell',true)->assertJsonPath('can_manage_session',true)->assertJsonPath('can_manage_movements',true);
        $this->postJson('/api/v1/ventescaisse/sessions',['opening_cash'=>1000,'request_key'=>'authorized-session-key-01'])->assertCreated();
        $this->postJson('/api/v1/ventescaisse/cash-movements',['direction'=>'entree','category'=>'apport','reason'=>'Monnaie de départ','amount'=>200])->assertCreated();
    }
}

<?php
namespace Tests\Feature;
use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
class StockRegisterTest extends TestCase {
 use RefreshDatabase;
 private User $user;private Officine $office;private int $revision=0;private int $serial=0;
 protected function setUp():void{parent::setUp();$this->user=User::create(['name'=>'Stock fictif','email'=>'stock@example.test','password'=>'Fictional12345']);$this->office=Officine::create(['name'=>'Stock office','slug'=>'stock-office','status'=>'active']);DB::table('officine_user')->insert(['user_id'=>$this->user->id,'officine_id'=>$this->office->id,'is_active'=>true,'is_admin'=>true,'permissions'=>'[]']);Sanctum::actingAs($this->user);$this->withHeader('X-Officine-ID',(string)$this->office->id);}
 private function operation(string $command,array $input,array $extra=[]){return $this->postJson('/api/v1/stock/operations',array_replace(['confirmed'=>true,'request_key'=>'stock-test-operation-'.(++$this->serial),'revision'=>$this->revision,'command'=>$command,'input'=>$input+['reason'=>'Justification fictive']],$extra));}
 private function write(string $command,array $input):void{$r=$this->operation($command,$input)->assertCreated();$this->revision=$r->json('revision');}
 private function snapshot():array{return $this->getJson('/api/v1/stock/workspace')->assertOk()->json();}
 private function fixture():array{
  $this->write('product',['name'=>'Produit fictif','code'=>'DEMO-API','unit'=>'Boîte','threshold'=>10]);$this->write('location',['name'=>'Réserve']);$this->write('location',['name'=>'Rayon']);$s=$this->snapshot();$p=$s['products'][0]['id'];$a=$s['locations'][0]['id'];$b=$s['locations'][1]['id'];
  $this->write('receipt',['productId'=>$p,'locationId'=>$a,'batch'=>'BATCH-01','expiry'=>now()->addMonths(6)->toDateString(),'quantity'=>100,'unitCost'=>500]);$s=$this->snapshot();return [$s['lots'][0]['id'],$a,$b,$p];
 }
 public function test_empty_workspace_has_no_demo_data_and_products_are_scoped():void{
  $this->getJson('/api/v1/stock/workspace')->assertOk()->assertJsonPath('revision',0)->assertJsonCount(0,'products')->assertHeader('Cache-Control','no-store, private');
  $this->write('product',['name'=>'Produit','code'=>'demo-api','unit'=>'Boîte','threshold'=>2]);$this->getJson('/api/v1/stock/workspace')->assertJsonPath('products.0.code','DEMO-API')->assertJsonPath('revision',1);
  $this->operation('product',['name'=>'Autre','code'=>'DEMO-API','unit'=>'Boîte','threshold'=>0])->assertUnprocessable();$this->assertDatabaseCount('stock_products',1);
 }
 public function test_replays_are_safe_and_stale_writes_cannot_double_stock():void{
  $this->operation('location',['name'=>'Non confirmé'],['confirmed'=>false])->assertUnprocessable();
  $input=['name'=>'Réserve'];$body=['request_key'=>'idempotent-stock-key-0001','revision'=>0];
  $this->operation('location',$input,$body)->assertCreated();$this->operation('location',$input,$body)->assertOk()->assertJsonPath('replayed',true);
  $this->operation('location',['name'=>'Différent'],$body)->assertConflict();$this->operation('location',['name'=>'Autre'])->assertConflict();$this->assertDatabaseCount('stock_operations',1);$this->assertDatabaseCount('stock_locations',1);
 }
 public function test_receipt_release_transfer_recall_and_waste_keep_a_ledger():void{
  [$id,$a,$b]=$this->fixture();$this->assertDatabaseHas('stock_batches',['status'=>'quarantine']);
  $this->operation('transfer',['lotId'=>$id,'locationId'=>$b,'quantity'=>10])->assertUnprocessable();
  $this->write('release',['lotId'=>$id]);$this->write('transfer',['lotId'=>$id,'locationId'=>$b,'quantity'=>20]);$s=$this->snapshot();$this->assertSame(100,array_sum(array_column($s['lots'],'quantity')));$this->assertSame(50000,array_sum(array_map(fn($l)=>$l['quantity']*$l['unitCost'],$s['lots'])));
  $this->write('recall',['lotId'=>$id]);$s=$this->snapshot();$this->assertSame(['recalled'],array_values(array_unique(array_column($s['lots'],'status'))));
  $this->operation('release',['lotId'=>$id])->assertUnprocessable();$this->operation('quarantine',['lotId'=>$id])->assertUnprocessable();
  $this->write('waste',['lotId'=>$id,'quantity'=>5]);$s=$this->snapshot();$this->assertSame(95,array_sum(array_column($s['lots'],'quantity')));$this->assertSame(-5,$s['events'][0]['quantity']);$this->assertDatabaseCount('stock_operations',8);$this->assertDatabaseCount('stock_balances',2);
 }
 public function test_inventory_traces_only_delta_and_invalid_quantities_roll_back():void{
  [$id]=$this->fixture();$this->write('inventory',['lotId'=>$id,'expected'=>100,'quantity'=>97]);$s=$this->snapshot();$this->assertSame(-3,$s['events'][0]['quantity']);
  $this->operation('inventory',['lotId'=>$id,'expected'=>100,'quantity'=>101])->assertConflict();$this->operation('waste',['lotId'=>$id,'quantity'=>98])->assertUnprocessable();$this->operation('waste',['lotId'=>$id,'quantity'=>1.5])->assertUnprocessable();$this->operation('waste',['lotId'=>$id,'quantity'=>1,'reason'=>' '])->assertUnprocessable();
  $this->assertDatabaseHas('stock_balances',['id'=>$id,'quantity'=>97]);$this->assertDatabaseCount('stock_operations',5);
 }
 public function test_expiry_and_duplicate_batch_cannot_bypass_controls():void{
  [$id,$a,$b,$p]=$this->fixture();$input=['productId'=>$p,'locationId'=>$a,'batch'=>'NEW','expiry'=>now()->toDateString(),'quantity'=>1,'unitCost'=>100];
  $this->operation('receipt',$input)->assertUnprocessable();$this->operation('receipt',array_replace($input,['batch'=>'batch-01','expiry'=>now()->addYear()->toDateString()]))->assertUnprocessable();
  DB::table('stock_batches')->update(['expiry'=>now()->subDay()->toDateString()]);$this->operation('release',['lotId'=>$id])->assertUnprocessable();$this->assertDatabaseCount('stock_batches',1);
 }
 public function test_foreign_ids_and_implicit_platform_access_are_denied():void{
  [$id,$a,$b,$p]=$this->fixture();$other=Officine::create(['name'=>'Other','slug'=>'other-stock','status'=>'active']);DB::table('officine_user')->insert(['user_id'=>$this->user->id,'officine_id'=>$other->id,'is_admin'=>true,'is_active'=>true,'permissions'=>'[]']);$this->withHeader('X-Officine-ID',(string)$other->id);$this->revision=0;
  $this->getJson('/api/v1/stock/workspace')->assertJsonCount(0,'lots');$this->operation('waste',['lotId'=>$id,'quantity'=>1])->assertNotFound();$this->operation('receipt',['productId'=>$p,'locationId'=>$a,'batch'=>'FOREIGN','expiry'=>now()->addYear()->toDateString(),'quantity'=>1,'unitCost'=>1])->assertNotFound();
  DB::table('officine_user')->where('officine_id',$other->id)->update(['is_admin'=>false]);$this->user->forceFill(['is_platform_admin'=>true,'is_support_coordinator'=>true])->save();Sanctum::actingAs($this->user);$this->getJson('/api/v1/stock/workspace')->assertForbidden();$this->operation('location',['name'=>'No'])->assertForbidden();
 }
 public function test_mfa_and_suspension_are_checked_for_stock():void{
  config(['socle.require_privileged_mfa'=>true]);$this->getJson('/api/v1/stock/workspace')->assertForbidden()->assertJsonPath('code','mfa_enrollment_required');$this->user->forceFill(['mfa_confirmed_at'=>now()])->save();Sanctum::actingAs($this->user);$this->getJson('/api/v1/stock/workspace')->assertOk();DB::table('officines')->where('id',$this->office->id)->update(['status'=>'suspended']);$this->operation('location',['name'=>'Non'])->assertForbidden();$this->getJson('/api/v1/stock/workspace')->assertForbidden();
 }
 public function test_database_refuses_negative_balance():void{
  [$id]=$this->fixture();try{DB::table('stock_balances')->where('id',$id)->update(['quantity'=>-1]);$this->fail('Negative stock accepted');}catch(\Illuminate\Database\QueryException){$this->assertTrue(true);}
 }
 public function test_database_enforces_same_office_on_balance_relationships():void{
  [$id]=$this->fixture();$other=Officine::create(['name'=>'Foreign','slug'=>'fk-stock','status'=>'active']);
  $this->expectException(\Illuminate\Database\QueryException::class);DB::table('stock_balances')->where('id',$id)->update(['officine_id'=>$other->id]);
 }
}

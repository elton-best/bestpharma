<?php
namespace Tests\Feature;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DispensationWorkflowTest extends TestCase
{
 use RefreshDatabase;
 private User $user; private Officine $office; private int $product; private int $balance;
 protected function setUp():void {
  parent::setUp(); $this->user=User::create(['name'=>'Dispensation test','email'=>'dispensation@example.test','password'=>'Fictional12345']);
   $this->office=Officine::create(['name'=>'Dispensation test office','slug'=>'disp-test','status'=>'active']);
   DB::table('officine_user')->insert(['user_id'=>$this->user->id,'officine_id'=>$this->office->id,'is_active'=>true,'is_admin'=>true,'permissions'=>'[]']);
   DB::table('officine_modules')->insert(['officine_id'=>$this->office->id,'module'=>'dispensation','is_active'=>true]);
  Sanctum::actingAs($this->user);$this->withHeader('X-Officine-ID',(string)$this->office->id);
  $this->product=DB::table('stock_products')->insertGetId(['officine_id'=>$this->office->id,'name'=>'Produit fictif','code'=>'D-1','unit'=>'boîte','threshold'=>0,'created_at'=>now(),'updated_at'=>now()]);
  $location=DB::table('stock_locations')->insertGetId(['officine_id'=>$this->office->id,'name'=>'Rayon test','created_at'=>now(),'updated_at'=>now()]);
  $batch=DB::table('stock_batches')->insertGetId(['officine_id'=>$this->office->id,'product_id'=>$this->product,'batch'=>'LOT-1','expiry'=>now()->addYear()->toDateString(),'unit_cost'=>0,'status'=>'available','created_at'=>now(),'updated_at'=>now()]);
  $this->balance=DB::table('stock_balances')->insertGetId(['officine_id'=>$this->office->id,'batch_id'=>$batch,'location_id'=>$location,'quantity'=>10,'created_at'=>now(),'updated_at'=>now()]);
 }
 private function requestBody(string $key='disp-request-replay-0001'):array{return ['request_key'=>$key,'kind'=>'prescription','prescription_reference'=>'RX-TEST','lines'=>[['product_id'=>$this->product,'quantity'=>4]]];}
  private function createRequest():int{return $this->postJson('/api/v1/dispensation/requests',$this->requestBody())->assertCreated()->json('data.id');}
  public function test_dispensing_requires_pharmacist_permission_and_accepts_an_officine_role_grant():void {
   $id=$this->createRequest();
   DB::table('officine_user')->where('user_id',$this->user->id)->where('officine_id',$this->office->id)->update(['is_admin'=>false]);
   $body=['confirmed'=>true,'decision'=>'dispense','pharmacist_visa_confirmed'=>true,'dispense_key'=>'disp-key-permission-test-01'];
   $this->postJson("/api/v1/dispensation/requests/{$id}/dispense",$body)->assertForbidden();
   $this->assertDatabaseHas('stock_balances',['id'=>$this->balance,'quantity'=>10]);
   $role=DB::table('officine_roles')->insertGetId(['officine_id'=>$this->office->id,'name'=>'Pharmacien habilité','permissions'=>json_encode(['dispensation.dispense']),'is_active'=>true,'version'=>1,'created_at'=>now(),'updated_at'=>now()]);
   $membership=DB::table('officine_user')->where('user_id',$this->user->id)->where('officine_id',$this->office->id)->value('id');
   DB::table('officine_member_roles')->insert(['membership_id'=>$membership,'role_id'=>$role]);
   $this->getJson('/api/v1/dispensation/workspace')->assertOk()->assertJsonPath('can_dispense',true);
   $this->postJson("/api/v1/dispensation/requests/{$id}/dispense",$body)->assertCreated()->assertJsonPath('data.status','dispensed');
   $this->assertDatabaseHas('stock_balances',['id'=>$this->balance,'quantity'=>6]);
  }
 public function test_request_is_saved_without_patient_name_or_stock_change_and_replay_is_safe():void {
  $body=$this->requestBody();$this->postJson('/api/v1/dispensation/requests',$body)->assertCreated()->assertJsonPath('data.status','pending_review');
  $this->postJson('/api/v1/dispensation/requests',$body)->assertOk()->assertJsonPath('replayed',true);
  $this->assertDatabaseCount('dispensation_requests',1);$this->assertDatabaseHas('stock_balances',['id'=>$this->balance,'quantity'=>10]);
   $this->assertDatabaseHas('dispensation_requests',['request_key'=>'disp-request-replay-0001','patient_reference'=>null]);
  $this->postJson('/api/v1/dispensation/requests',array_replace($body,['request_key'=>'disp-request-replay-0001','lines'=>[['product_id'=>$this->product,'quantity'=>3]]]))->assertConflict();
 }
 public function test_explicit_human_decision_and_visa_are_required_then_fefo_output_is_atomic_and_idempotent():void {
  $id=$this->createRequest();$this->postJson("/api/v1/dispensation/requests/{$id}/dispense",['confirmed'=>true,'decision'=>'dispense','dispense_key'=>'disp-key-for-replay-00001'])->assertUnprocessable();
  $body=['confirmed'=>true,'decision'=>'dispense','pharmacist_visa_confirmed'=>true,'dispense_key'=>'disp-key-for-replay-00001'];
  $this->postJson("/api/v1/dispensation/requests/{$id}/dispense",$body)->assertCreated()->assertJsonPath('data.status','dispensed');
  $this->postJson("/api/v1/dispensation/requests/{$id}/dispense",$body)->assertOk()->assertJsonPath('replayed',true);
  $this->assertDatabaseHas('stock_balances',['id'=>$this->balance,'quantity'=>6]);$this->assertDatabaseCount('dispensation_movements',1);
 }
 public function test_expired_quarantined_and_other_tenant_stock_cannot_be_dispensed():void {
  $id=$this->createRequest();DB::table('stock_batches')->update(['expiry'=>now()->toDateString()]);
  $this->postJson("/api/v1/dispensation/requests/{$id}/dispense",['confirmed'=>true,'decision'=>'dispense','pharmacist_visa_confirmed'=>true,'dispense_key'=>'disp-key-expired-00000001'])->assertUnprocessable();
  $this->assertDatabaseHas('stock_balances',['id'=>$this->balance,'quantity'=>10]);
  DB::table('stock_batches')->update(['expiry'=>now()->addYear()->toDateString(),'status'=>'quarantine']);
  $this->postJson("/api/v1/dispensation/requests/{$id}/dispense",['confirmed'=>true,'decision'=>'dispense','pharmacist_visa_confirmed'=>true,'dispense_key'=>'disp-key-quarantine-00001'])->assertUnprocessable();
   $other=Officine::create(['name'=>'Other tenant','slug'=>'other-disp-test','status'=>'active']);$this->withHeader('X-Officine-ID',(string)$other->id);
   DB::table('officine_user')->insert(['user_id'=>$this->user->id,'officine_id'=>$other->id,'is_active'=>true,'is_admin'=>true,'permissions'=>'[]']);
   DB::table('officine_modules')->insert(['officine_id'=>$other->id,'module'=>'dispensation','is_active'=>true]);
  $this->getJson('/api/v1/dispensation/workspace')->assertOk()->assertJsonCount(0,'products');
  $this->postJson("/api/v1/dispensation/requests/{$id}/dispense",['confirmed'=>true,'decision'=>'dispense','pharmacist_visa_confirmed'=>true,'dispense_key'=>'disp-key-foreign-00000001'])->assertNotFound();
 }
 public function test_stock_is_never_allowed_to_become_negative():void {
  $this->assertSame(10,(int)DB::table('stock_balances')->where('id',$this->balance)->value('quantity'));
  $id=$this->postJson('/api/v1/dispensation/requests',array_replace($this->requestBody('disp-request-too-many-0001'),['lines'=>[['product_id'=>$this->product,'quantity'=>11]]]))->assertCreated()->json('data.id');
  $this->postJson("/api/v1/dispensation/requests/{$id}/dispense",['confirmed'=>true,'decision'=>'dispense','pharmacist_visa_confirmed'=>true,'dispense_key'=>'disp-key-too-many-000001'])->assertUnprocessable();
  $this->assertDatabaseHas('stock_balances',['id'=>$this->balance,'quantity'=>10]);$this->assertDatabaseCount('dispensation_movements',0);
 }
 public function test_competing_requests_cannot_oversell_a_balance():void {
  $first=$this->postJson('/api/v1/dispensation/requests',array_replace($this->requestBody('disp-request-race-first-001'),['lines'=>[['product_id'=>$this->product,'quantity'=>7]]]))->assertCreated()->json('data.id');
  $second=$this->postJson('/api/v1/dispensation/requests',array_replace($this->requestBody('disp-request-race-second-01'),['lines'=>[['product_id'=>$this->product,'quantity'=>7]]]))->assertCreated()->json('data.id');
  $this->postJson("/api/v1/dispensation/requests/{$first}/dispense",['confirmed'=>true,'decision'=>'dispense','pharmacist_visa_confirmed'=>true,'dispense_key'=>'disp-key-race-first-000001'])->assertCreated();
  $this->postJson("/api/v1/dispensation/requests/{$second}/dispense",['confirmed'=>true,'decision'=>'dispense','pharmacist_visa_confirmed'=>true,'dispense_key'=>'disp-key-race-second-00001'])->assertUnprocessable();
  $this->assertDatabaseHas('stock_balances',['id'=>$this->balance,'quantity'=>3]);$this->assertDatabaseCount('dispensation_movements',1);
 }
}

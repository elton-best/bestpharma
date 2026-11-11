<?php
namespace Tests\Feature;
use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
class SupportRequestsTest extends TestCase {
 use RefreshDatabase;
 private User $u;private Officine $o;
 protected function setUp():void{parent::setUp();$this->u=User::create(['name'=>'Fictif','email'=>'user@example.test','password'=>'Fictional12345']);$this->o=Officine::create(['name'=>'Locale','slug'=>'locale','status'=>'active']);DB::table('officine_user')->insert(['user_id'=>$this->u->id,'officine_id'=>$this->o->id,'is_active'=>true,'is_admin'=>true,'permissions'=>'[]']);Sanctum::actingAs($this->u);$this->withHeader('X-Officine-ID',(string)$this->o->id);}
 private function draft(array $data=[]):int{return $this->postJson('/api/v1/support/requests',$data+['request_key'=>'request-fixture-0000001'])->assertCreated()->json('id');}
 public function test_partial_draft_is_idempotent_and_cannot_inject_status_or_tenant():void{$id=$this->draft(['status'=>'submitted','officine_id'=>999,'created_by'=>999]);$this->postJson('/api/v1/support/requests',['request_key'=>'request-fixture-0000001'])->assertOk()->assertJsonPath('id',$id);$this->assertDatabaseHas('support_requests',['id'=>$id,'status'=>'draft','officine_id'=>$this->o->id,'created_by'=>$this->u->id]);$this->postJson('/api/v1/support/requests',['request_key'=>'request-fixture-0000001','title'=>'Contenu changé'])->assertConflict();$this->assertDatabaseCount('support_requests',1);}
 public function test_submission_validates_fields_and_version_and_replay_is_safe():void{$id=$this->draft();$url='/api/v1/support/requests/'.$id;$this->postJson($url.'/submit',['version'=>1])->assertUnprocessable();$this->patchJson($url,['version'=>1,'title'=>'Besoin fictif','description'=>'Accompagnement demandé','contact'=>'Titulaire fictif'])->assertOk();$this->patchJson($url,['version'=>1,'title'=>'Périmé'])->assertConflict();$this->postJson($url.'/submit',['version'=>2])->assertOk();$this->postJson($url.'/submit',['version'=>2])->assertOk();$this->assertSame(1,DB::table('tenant_audit_logs')->where('action','support.request.submitted')->count());$this->assertDatabaseCount('notification_outbox',1);$this->assertDatabaseHas('support_requests',['id'=>$id,'status'=>'submitted','version'=>3]);$this->patchJson($url,['version'=>3,'title'=>'Non modifiable'])->assertConflict();}
 public function test_withdraw_requires_reason_keeps_history_and_prevents_resubmit():void{$id=$this->draft();$url='/api/v1/support/requests/'.$id;$this->postJson($url.'/withdraw',['version'=>1,'reason'=>' '])->assertUnprocessable();$this->postJson($url.'/withdraw',['version'=>1,'reason'=>'Besoin reporté'])->assertOk();$this->postJson($url.'/submit',['version'=>2])->assertConflict();$this->postJson($url.'/withdraw',['version'=>2,'reason'=>'Encore'])->assertConflict();$this->assertDatabaseHas('support_requests',['id'=>$id,'status'=>'withdrawn','withdrawal_reason'=>'Besoin reporté']);$this->assertDatabaseHas('tenant_audit_logs',['action'=>'support.request.withdrawn']);}
 public function test_foreign_ids_are_hidden_and_other_authors_drafts_are_private():void{$id=$this->draft();$other=User::create(['name'=>'Autre','email'=>'other@example.test','password'=>'Fictional12345']);DB::table('officine_user')->insert(['user_id'=>$other->id,'officine_id'=>$this->o->id,'is_active'=>true,'is_admin'=>true,'permissions'=>'[]']);Sanctum::actingAs($other);$this->getJson('/api/v1/support/requests')->assertOk()->assertJsonCount(0,'data');$this->getJson('/api/v1/officine/journal?action=support.request.draft_created')->assertOk()->assertJsonCount(0,'data');$this->patchJson('/api/v1/support/requests/'.$id,['version'=>1,'title'=>'Hors portée'])->assertNotFound();$foreign=Officine::create(['name'=>'Autre','slug'=>'autre','status'=>'active']);DB::table('officine_user')->insert(['user_id'=>$other->id,'officine_id'=>$foreign->id,'is_active'=>true,'is_admin'=>true,'permissions'=>'[]']);$this->withHeader('X-Officine-ID',(string)$foreign->id)->postJson('/api/v1/support/requests/'.$id.'/submit',['version'=>1])->assertNotFound();}
 public function test_non_admin_platform_and_coordinator_have_no_implicit_business_access():void{DB::table('officine_user')->where('user_id',$this->u->id)->update(['is_admin'=>false]);$this->u->forceFill(['is_platform_admin'=>true,'is_support_coordinator'=>true])->save();Sanctum::actingAs($this->u);$this->getJson('/api/v1/support/requests')->assertForbidden();$this->postJson('/api/v1/support/requests',['request_key'=>'request-fixture-0000001'])->assertForbidden();}
 public function test_mandatory_mfa_and_office_suspension_apply_to_m2():void{config(['socle.require_privileged_mfa'=>true]);$this->getJson('/api/v1/support/requests')->assertForbidden()->assertJsonPath('code','mfa_enrollment_required');$this->u->forceFill(['mfa_confirmed_at'=>now()])->save();Sanctum::actingAs($this->u);$this->getJson('/api/v1/support/requests')->assertOk();DB::table('officines')->where('id',$this->o->id)->update(['status'=>'suspended']);$this->getJson('/api/v1/support/requests')->assertForbidden();}
 public function test_search_and_status_filter_are_scoped_and_no_mission_is_created():void{$this->draft(['title'=>'Qualité']);$this->draft(['request_key'=>'request-fixture-0000002','title'=>'Organisation']);$this->getJson('/api/v1/support/requests?search=Qualit&status=draft')->assertJsonCount(1,'data');$this->getJson('/api/v1/support/requests?status=withdrawn')->assertJsonCount(0,'data');$this->assertDatabaseCount('officine_support_assignments',0);}
 public function test_dashboard_counts_are_scoped_private_and_independent_of_filters():void{
 $own=$this->draft(['title'=>'Privé']);
 $submitted=$this->draft(['request_key'=>'request-summary-0000002','title'=>'Soumise','description'=>'Besoin','contact'=>'Titulaire']);
 $this->postJson('/api/v1/support/requests/'.$submitted.'/submit',['version'=>1])->assertOk();
 $withdrawn=$this->draft(['request_key'=>'request-summary-0000003']);
 $this->postJson('/api/v1/support/requests/'.$withdrawn.'/withdraw',['version'=>1,'reason'=>'Report'])->assertOk();
 $other=User::create(['name'=>'Autre','email'=>'summary@example.test','password'=>'Fictional12345']);
 DB::table('support_requests')->where('id',$own)->update(['created_by'=>$other->id]);
 $this->draft(['request_key'=>'request-summary-0000004','title'=>'Mon brouillon']);
 $foreign=Officine::create(['name'=>'Étrangère','slug'=>'foreign-summary','status'=>'active']);
 DB::table('support_requests')->insert(['officine_id'=>$foreign->id,'created_by'=>$this->u->id,'request_key'=>'foreign-summary-00001','reference'=>'ACC-FOREIGN','status'=>'submitted']);
 $this->getJson('/api/v1/support/requests?status=submitted&search=Soumise')->assertOk()->assertJsonCount(1,'data')->assertJsonPath('summary',['draft'=>1,'submitted'=>1,'withdrawn'=>1]);
 DB::table('officine_user')->where('user_id',$this->u->id)->update(['is_admin'=>false]);
 $this->getJson('/api/v1/support/requests')->assertForbidden()->assertJsonMissingPath('summary');
 }
 public function test_central_intake_requires_coordinator_mfa_and_hides_private_or_withdrawn_requests():void{
 $draft=$this->draft();
 $id=$this->draft(['request_key'=>'intake-fixture-0000002','title'=>'Besoin','description'=>'Description','contact'=>'Titulaire']);
 $this->postJson('/api/v1/support/requests/'.$id.'/submit',['version'=>1])->assertOk();
 $this->getJson('/api/v1/support/intake')->assertForbidden();
 $this->u->forceFill(['is_platform_admin'=>true,'mfa_confirmed_at'=>now()])->save();Sanctum::actingAs($this->u);
 $this->getJson('/api/v1/support/intake')->assertForbidden();
 $this->u->forceFill(['is_support_coordinator'=>true,'mfa_confirmed_at'=>null])->save();Sanctum::actingAs($this->u);
 $this->getJson('/api/v1/support/intake')->assertForbidden();
 $this->u->forceFill(['mfa_confirmed_at'=>now()])->save();Sanctum::actingAs($this->u);
 $this->getJson('/api/v1/support/intake')->assertOk()->assertJsonCount(1,'data')->assertJsonPath('data.0.id',$id);
 $this->postJson('/api/v1/support/intake/'.$draft.'/qualify',['version'=>1,'qualification'=>'ready','note'=>'Note'])->assertNotFound();
 $url='/api/v1/support/intake/'.$id.'/qualify';
 $this->postJson($url,['version'=>2,'qualification'=>'ready','note'=>' '])->assertUnprocessable();
 $this->postJson($url,['version'=>1,'qualification'=>'ready','note'=>'Note'])->assertConflict();
 $this->postJson($url,['version'=>2,'qualification'=>'ready','note'=>'Proposition à préparer'])->assertOk();
 $this->postJson($url,['version'=>2,'qualification'=>'ready','note'=>'Rejeu'])->assertConflict();
 $this->assertDatabaseHas('support_requests',['id'=>$id,'status'=>'submitted','qualification'=>'ready','version'=>3]);
 $this->assertSame(1,DB::table('tenant_audit_logs')->where('action','support.request.qualified')->count());
 $this->assertStringNotContainsString('Proposition à préparer',DB::table('tenant_audit_logs')->where('action','support.request.qualified')->value('payload'));
 $this->assertDatabaseCount('officine_support_assignments',0);
 $this->postJson('/api/v1/support/requests/'.$id.'/withdraw',['version'=>3,'reason'=>'Report'])->assertOk();
 $this->getJson('/api/v1/support/intake')->assertJsonCount(0,'data');
 $this->postJson($url,['version'=>4,'qualification'=>'ready','note'=>'Note'])->assertNotFound();
 }
 public function test_intake_excludes_suspended_offices_and_rechecks_on_qualification():void{
 $id=$this->draft(['title'=>'Besoin','description'=>'Description','contact'=>'Titulaire']);
 $this->postJson('/api/v1/support/requests/'.$id.'/submit',['version'=>1])->assertOk();
 $this->u->forceFill(['is_support_coordinator'=>true,'mfa_confirmed_at'=>now()])->save();Sanctum::actingAs($this->u);
 DB::table('officines')->where('id',$this->o->id)->update(['status'=>'suspended']);
 $this->getJson('/api/v1/support/intake')->assertOk()->assertJsonCount(0,'data');
 $this->postJson('/api/v1/support/intake/'.$id.'/qualify',['version'=>2,'qualification'=>'ready','note'=>'Note'])->assertNotFound();
 }
 private function missionFixture():array{
 $id=$this->draft(['title'=>'Demande mission','description'=>'Besoin','contact'=>'Titulaire']);
 $this->postJson('/api/v1/support/requests/'.$id.'/submit',['version'=>1])->assertOk();
 $coord=User::create(['name'=>'Coordination','email'=>'coord-mission@example.test','password'=>'Fictional12345',]);$coord->forceFill(['is_support_coordinator'=>true,'mfa_confirmed_at'=>now()])->save();Sanctum::actingAs($coord);
 $this->postJson('/api/v1/support/intake/'.$id.'/qualify',['version'=>2,'qualification'=>'ready','note'=>'Prête'])->assertOk();
 return [$id,$coord,['version'=>3,'title'=>'Mission qualité','scope'=>'Périmètre partagé','starts_on'=>now()->addDay()->toDateString(),'ends_on'=>now()->addDays(10)->toDateString()]];
 }
 public function test_proposal_and_explicit_acceptance_never_grant_data_access():void{
 [$id,$coord,$data]=$this->missionFixture();$url='/api/v1/support/intake/'.$id.'/propose-mission';
 $this->postJson($url,array_replace($data,['ends_on'=>now()->subDay()->toDateString()]))->assertUnprocessable();
 $this->postJson($url,array_replace($data,['version'=>2]))->assertConflict();
 $this->postJson($url,$data+['status'=>'accepted','officine_id'=>999])->assertCreated();
 $this->postJson($url,$data)->assertConflict();
 $this->getJson('/api/v1/support/intake')->assertJsonPath('data.0.mission.status','proposed');
 $decision='/api/v1/support/requests/'.$id.'/mission-decision';
 $this->postJson($decision,['version'=>1,'decision'=>'accepted','confirmed'=>true])->assertForbidden();
 Sanctum::actingAs($this->u);
 $this->getJson('/api/v1/support/requests')->assertJsonPath('data.0.mission.title','Mission qualité');
 $this->postJson($decision,['version'=>1,'decision'=>'accepted'])->assertUnprocessable();
 $this->postJson($decision,['version'=>2,'decision'=>'accepted','confirmed'=>true])->assertConflict();
 $this->postJson($decision,['version'=>1,'decision'=>'accepted','confirmed'=>true])->assertOk();
 $this->postJson($decision,['version'=>1,'decision'=>'accepted','confirmed'=>true])->assertConflict();
 $this->assertDatabaseHas('support_missions',['support_request_id'=>$id,'status'=>'accepted','decided_by'=>$this->u->id,'version'=>2]);
 $this->assertDatabaseCount('officine_support_assignments',0);
 $this->assertSame(1,DB::table('tenant_audit_logs')->where('action','support.mission.accepted')->count());
 $this->postJson('/api/v1/support/requests/'.$id.'/withdraw',['version'=>5,'reason'=>'Report'])->assertConflict();
 }
 public function test_refusal_needs_reason():void{
 [$id,$coord,$data]=$this->missionFixture();$this->postJson('/api/v1/support/intake/'.$id.'/propose-mission',$data)->assertCreated();Sanctum::actingAs($this->u);
 $url='/api/v1/support/requests/'.$id.'/mission-decision';
 $this->postJson($url,['version'=>1,'decision'=>'refused','confirmed'=>true,'reason'=>' '])->assertUnprocessable();
 $this->postJson($url,['version'=>1,'decision'=>'refused','confirmed'=>true,'reason'=>'Période inadaptée'])->assertOk();
 $this->assertDatabaseHas('support_missions',['support_request_id'=>$id,'status'=>'refused','decision_reason'=>'Période inadaptée']);
 }
 public function test_pending_mission_is_cancelled_by_withdrawal():void{
 [$id,$coord,$data]=$this->missionFixture();$this->postJson('/api/v1/support/intake/'.$id.'/propose-mission',$data)->assertCreated();Sanctum::actingAs($this->u);
 $this->postJson('/api/v1/support/requests/'.$id.'/withdraw',['version'=>4,'reason'=>'Report'])->assertOk();
 $this->assertDatabaseHas('support_missions',['support_request_id'=>$id,'status'=>'cancelled']);
 $this->postJson('/api/v1/support/requests/'.$id.'/mission-decision',['version'=>1,'decision'=>'accepted','confirmed'=>true])->assertConflict();
 }
}

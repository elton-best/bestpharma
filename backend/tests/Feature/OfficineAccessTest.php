<?php
namespace Tests\Feature;
use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
class OfficineAccessTest extends TestCase {
 use RefreshDatabase;
 private User $admin; private User $staff; private User $coordinator; private Officine $office; private Officine $other;
 protected function setUp(): void {
  parent::setUp();$this->admin=$this->user('admin');$this->staff=$this->user('staff');$this->staff->forceFill(['is_support_staff'=>true])->save();$this->coordinator=$this->user('coordinate');$this->coordinator->forceFill(['is_support_coordinator'=>true])->save();
  $this->office=Officine::create(['name'=>'Office A','slug'=>'office-a','status'=>'active']);$this->other=Officine::create(['name'=>'Office B','slug'=>'office-b','status'=>'active']);
  DB::table('officine_user')->insert(['officine_id'=>$this->office->id,'user_id'=>$this->admin->id,'is_admin'=>true,'is_active'=>true,'permissions'=>'[]']);
  DB::table('officine_modules')->insert(['officine_id'=>$this->office->id,'module'=>'qualite','is_active'=>true]);$this->as($this->admin);
 }
 private function user(string $name):User{return User::create(['name'=>$name,'email'=>$name.'@example.test','password'=>'Fictional12345']);}
 private function as(User $u):void{Sanctum::actingAs($u);$this->withHeader('X-Officine-ID',(string)$this->office->id);}
 private function proposal(array $changes=[]):array{return array_replace(['user_id'=>$this->staff->id,'scope'=>'Lecture qualité','permissions'=>['officine.read','qualite.read'],'starts_on'=>now()->subDay()->toDateString(),'ends_on'=>now()->addDays(20)->toDateString(),'request_key'=>'assignment-unique-key-0001'],$changes);}
 private function propose(array $changes=[]):int{$this->as($this->coordinator);$id=$this->postJson('/api/v1/platform/officines/'.$this->office->id.'/support',$this->proposal($changes))->assertCreated()->json('id');$this->as($this->admin);return $id;}
 private function decide(int $id,string $decision='approved',int $version=1,array $extra=[]){return $this->postJson('/api/v1/officine/support/'.$id.'/decision',array_replace(['decision'=>$decision,'version'=>$version],$extra));}
 private function profile(array $extra=[]):array{return array_replace(['name'=>'Officine updated','phone'=>'+2290100000000','city'=>'Porto-Novo','address'=>'Adresse fictive','country'=>'Bénin','department'=>'Ouémé','contact_name'=>'Contact fictif','email'=>'contact@example.test','profile_version'=>1],$extra);}
 public function test_context_lists_only_memberships_and_never_grants_platform_admin_access():void{
  $this->getJson('/api/v1/me')->assertOk()->assertJsonCount(1,'officines')->assertJsonPath('officines.0.id',$this->office->id);
  $this->withHeader('X-Officine-ID',(string)$this->other->id)->getJson('/api/v1/officine')->assertForbidden();
  $this->coordinator->forceFill(['is_platform_admin'=>true])->save();$this->as($this->coordinator);$this->getJson('/api/v1/officine')->assertForbidden();$this->getJson('/api/v1/me')->assertJsonCount(0,'officines');
 }
 public function test_profile_updates_are_versioned_whitelisted_and_audited():void{
  $this->putJson('/api/v1/officine',$this->profile(['status'=>'suspended','slug'=>'hacked','organization_id'=>999]))->assertOk()->assertJsonPath('data.profile_version',2)->assertJsonPath('data.status','active')->assertJsonPath('data.slug','office-a');
  $this->putJson('/api/v1/officine',$this->profile())->assertConflict();$this->assertDatabaseHas('tenant_audit_logs',['officine_id'=>$this->office->id,'action'=>'officine.profile.updated']);
 }
 public function test_non_admin_cannot_edit_contacts_profile_history_or_support():void{
  DB::table('officine_user')->where('user_id',$this->admin->id)->update(['is_admin'=>false]);
  $this->getJson('/api/v1/officine')->assertOk();$this->putJson('/api/v1/officine',$this->profile())->assertForbidden();foreach(['contacts','history','support'] as $path)$this->getJson('/api/v1/officine/'.$path)->assertForbidden();
 }
 public function test_contacts_are_not_accounts_and_cannot_cross_tenants():void{
  $data=['name'=>'Contact only','function'=>'Titulaire','phone'=>'+2290100000000','email'=>'contact@example.test','type'=>'professionnel','is_active'=>true];
  $id=$this->postJson('/api/v1/officine/contacts',$data+['officine_id'=>$this->other->id])->assertCreated()->json('id');$this->assertDatabaseMissing('users',['email'=>'contact@example.test']);
  $this->putJson('/api/v1/officine/contacts/'.$id,$data+['version'=>1])->assertOk();$this->putJson('/api/v1/officine/contacts/'.$id,$data+['version'=>1])->assertConflict();
  $this->putJson('/api/v1/officine/contacts/'.$id,array_replace($data,['is_active'=>false,'version'=>2]))->assertOk();$this->assertDatabaseHas('officine_contacts',['id'=>$id,'is_active'=>false]);
  $foreign=DB::table('officine_contacts')->insertGetId(['officine_id'=>$this->other->id]+$data);$this->putJson('/api/v1/officine/contacts/'.$foreign,$data+['version'=>1])->assertNotFound();$this->getJson('/api/v1/officine/contacts')->assertJsonCount(1,'data');
 }
 public function test_personal_profile_cannot_escalate_or_change_identity():void{
  $this->putJson('/api/v1/me',['name'=>'Renamed','phone'=>'123','profile_version'=>1,'email'=>'attacker@example.test','is_support_staff'=>true,'is_platform_admin'=>true])->assertOk()->assertJsonPath('user.name','Renamed')->assertJsonPath('user.email',$this->admin->email)->assertJsonPath('user.profile_version',2);
  $this->assertFalse((bool)$this->admin->fresh()->is_support_staff);$this->putJson('/api/v1/me',['name'=>'Stale','profile_version'=>1])->assertConflict();
 }
 public function test_only_coordinator_can_propose_and_only_eligible_staff_with_safe_permissions():void{
  $url='/api/v1/platform/officines/'.$this->office->id.'/support';$this->postJson($url,$this->proposal())->assertForbidden();$this->as($this->coordinator);
  $this->postJson($url,$this->proposal(['permissions'=>['qualite.write']]))->assertUnprocessable();$this->postJson($url,$this->proposal(['user_id'=>$this->admin->id]))->assertUnprocessable();$this->postJson($url,$this->proposal(['ends_on'=>'2000-01-01']))->assertUnprocessable();
 }
 public function test_proposal_is_idempotent_and_duplicate_live_access_is_rejected():void{
  $id=$this->propose();$this->as($this->coordinator);$url='/api/v1/platform/officines/'.$this->office->id.'/support';$this->postJson($url,$this->proposal())->assertCreated()->assertJsonPath('id',$id);$this->assertDatabaseCount('officine_support_assignments',1);
  $this->postJson($url,$this->proposal(['scope'=>'Different']))->assertConflict();$this->postJson($url,$this->proposal(['request_key'=>'assignment-another-key-0002']))->assertConflict();
 }
 public function test_pending_then_approved_access_is_read_only_and_revoked_on_next_request():void{
  $id=$this->propose();$this->as($this->staff);$this->getJson('/api/v1/me')->assertJsonCount(0,'officines');$this->getJson('/api/v1/qualite/actions')->assertForbidden();
  $this->as($this->admin);$this->decide($id)->assertOk();$this->as($this->staff);$this->getJson('/api/v1/me')->assertJsonCount(1,'officines')->assertJsonPath('officines.0.access_type','support');$this->getJson('/api/v1/officine')->assertOk()->assertJsonPath('is_admin',false);$this->getJson('/api/v1/qualite/actions')->assertOk();$this->getJson('/api/v1/team')->assertForbidden();$this->postJson('/api/v1/qualite/actions',[])->assertForbidden();$this->getJson('/api/v1/officine/history')->assertForbidden();
  $this->as($this->admin);$this->decide($id,'revoked',2,['reason'=>'Accès retiré'])->assertOk();$this->as($this->staff);$this->getJson('/api/v1/qualite/actions')->assertForbidden();$this->getJson('/api/v1/me')->assertJsonCount(0,'officines');
 }
 public function test_expired_future_and_disabled_staff_have_no_access():void{
  $id=$this->propose();$this->decide($id)->assertOk();$this->as($this->staff);
  DB::table('officine_support_assignments')->where('id',$id)->update(['starts_on'=>now()->addDay()->toDateString()]);$this->getJson('/api/v1/officine')->assertForbidden();
  DB::table('officine_support_assignments')->where('id',$id)->update(['starts_on'=>'2000-01-01','ends_on'=>'2001-01-01']);$this->getJson('/api/v1/officine')->assertForbidden();
  DB::table('officine_support_assignments')->where('id',$id)->update(['ends_on'=>now()->addDay()->toDateString()]);$this->staff->forceFill(['is_support_staff'=>false])->save();$this->as($this->staff);$this->getJson('/api/v1/officine')->assertForbidden();
 }
 public function test_foreign_assignment_and_self_approval_are_denied():void{
  $id=$this->propose();DB::table('officine_support_assignments')->where('id',$id)->update(['officine_id'=>$this->other->id]);$this->decide($id)->assertNotFound();
  DB::table('officine_support_assignments')->where('id',$id)->update(['officine_id'=>$this->office->id,'user_id'=>$this->admin->id]);$this->decide($id)->assertForbidden();
 }
 public function test_reason_and_versions_are_required_and_final_decisions_cannot_be_replayed():void{
  $id=$this->propose();$this->decide($id,'refused')->assertUnprocessable();$this->decide($id,'refused',1,['reason'=>'Périmètre non retenu'])->assertOk();$this->decide($id)->assertConflict();$this->decide($id,'approved',2)->assertConflict();$this->assertDatabaseHas('tenant_audit_logs',['action'=>'support.refused']);
 }
 public function test_suspended_membership_cannot_bypass_through_assignment():void{
  $id=$this->propose();$this->decide($id)->assertOk();DB::table('officine_user')->insert(['officine_id'=>$this->office->id,'user_id'=>$this->staff->id,'is_active'=>false,'permissions'=>'[]']);$this->as($this->staff);$this->getJson('/api/v1/officine')->assertForbidden();$this->getJson('/api/v1/me')->assertJsonCount(0,'officines');
 }
 public function test_office_and_module_state_still_apply_to_support_staff():void{
  $id=$this->propose();$this->decide($id)->assertOk();$this->as($this->staff);DB::table('officine_modules')->where('officine_id',$this->office->id)->update(['is_active'=>false]);$this->getJson('/api/v1/qualite/actions')->assertForbidden();DB::table('officines')->where('id',$this->office->id)->update(['status'=>'suspended']);$this->getJson('/api/v1/officine')->assertForbidden();
 }
 public function test_history_contains_no_raw_invitation_or_personal_payload():void{
  DB::table('tenant_audit_logs')->insert(['officine_id'=>$this->office->id,'action'=>'officine.profile.updated','payload'=>json_encode(['secret'=>'never-return'])]);DB::table('tenant_audit_logs')->insert(['officine_id'=>$this->other->id,'action'=>'support.approved']);$r=$this->getJson('/api/v1/officine/history')->assertOk()->assertJsonCount(1,'data');$this->assertStringNotContainsString('never-return',$r->getContent());
 }
 public function test_modification_requires_new_proposal_and_coordinator_end_cuts_access():void{
  $id=$this->propose();$this->decide($id,'changes_requested',1,['reason'=>'Limiter la portée'])->assertOk();$this->as($this->staff);$this->getJson('/api/v1/officine')->assertForbidden();$this->as($this->admin);$this->decide($id,'approved',2)->assertConflict();
  $new=$this->propose(['request_key'=>'assignment-second-key-0002','scope'=>'Portée corrigée']);$this->decide($new)->assertOk();$this->as($this->staff);$this->getJson('/api/v1/officine')->assertOk();$this->as($this->coordinator);$this->postJson('/api/v1/platform/officines/'.$this->office->id.'/support/'.$new.'/end',['version'=>2,'reason'=>'Fin de mission'])->assertOk();$this->as($this->staff);$this->getJson('/api/v1/officine')->assertForbidden();$this->assertDatabaseHas('officine_support_assignments',['id'=>$id,'status'=>'changes_requested']);
 }
 public function test_expired_pending_request_can_be_reproposed_and_internal_deactivation_cuts_existing_access():void{
  $id=$this->propose();DB::table('officine_support_assignments')->where('id',$id)->update(['created_at'=>now()->subDays(15)]);$this->decide($id)->assertConflict();$new=$this->propose(['request_key'=>'assignment-second-key-0002']);$this->decide($new)->assertOk();$this->staff->forceFill(['internal_active'=>false])->save();$this->as($this->staff);$this->getJson('/api/v1/officine')->assertForbidden();$this->getJson('/api/v1/me')->assertOk()->assertJsonCount(0,'officines');
 }

}

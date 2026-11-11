<?php
namespace Tests\Feature;
use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
class MissionWorkspaceTest extends TestCase {
 use RefreshDatabase;
 private User $admin;private User $coord;private User $staff;private Officine $office;private int $requestId;private int $mission;private int $assignment;
 protected function setUp():void{parent::setUp();$this->admin=User::create(['name'=>'Admin','email'=>'admin-mission@example.test','password'=>'Fictional12345']);$this->coord=User::create(['name'=>'Coord','email'=>'coord-workspace@example.test','password'=>'Fictional12345']);$this->coord->forceFill(['is_support_coordinator'=>true,'mfa_confirmed_at'=>now()])->save();$this->staff=User::create(['name'=>'Intervenant','email'=>'staff-mission@example.test','password'=>'Fictional12345']);$this->staff->forceFill(['is_support_staff'=>true])->save();$this->office=Officine::create(['name'=>'Officine','slug'=>'workspace','status'=>'active']);DB::table('officine_user')->insert(['user_id'=>$this->admin->id,'officine_id'=>$this->office->id,'is_admin'=>true,'is_active'=>true,'permissions'=>'[]']);
 $this->requestId=DB::table('support_requests')->insertGetId(['officine_id'=>$this->office->id,'created_by'=>$this->admin->id,'reference'=>'ACC-WORKSPACE','request_key'=>'workspace-request-00001','status'=>'submitted']);
 $this->mission=DB::table('support_missions')->insertGetId(['support_request_id'=>$this->requestId,'proposed_by'=>$this->coord->id,'title'=>'Mission confidentielle','scope'=>'Périmètre privé','starts_on'=>now()->subDay()->toDateString(),'ends_on'=>now()->addDays(10)->toDateString(),'status'=>'accepted']);
 $this->assignment=DB::table('officine_support_assignments')->insertGetId(['officine_id'=>$this->office->id,'user_id'=>$this->staff->id,'proposed_by'=>$this->coord->id,'scope'=>'Mission accompagnement','permissions'=>json_encode(['accompagnement.read','accompagnement.write']),'starts_on'=>now()->subDay()->toDateString(),'ends_on'=>now()->addDays(10)->toDateString(),'request_key'=>'workspace-assignment-001','created_at'=>now(),'updated_at'=>now()]);$this->withHeader('X-Officine-ID',(string)$this->office->id);Sanctum::actingAs($this->admin);
 }
 private function url():string{return '/api/v1/support/missions/'.$this->mission;}
 private function propose(string $role='lead'):int{Sanctum::actingAs($this->coord);$this->postJson('/api/v1/support/intake/'.$this->requestId.'/team',['version'=>1,'assignment_id'=>$this->assignment,'role'=>$role,'confirmed'=>true])->assertCreated();return DB::table('support_mission_team')->value('id');}
 private function approve(int $member):void{DB::table('officine_support_assignments')->where('id',$this->assignment)->update(['status'=>'approved']);Sanctum::actingAs($this->admin);$this->postJson($this->url().'/team/'.$member.'/decision',['version'=>1,'decision'=>'approved','reason'=>'Périmètre vérifié','confirmed'=>true])->assertOk();}
 private function transition(string $action,int $version){return $this->postJson($this->url().'/transition',['action'=>$action,'version'=>$version,'reason'=>'Décision opérationnelle','confirmed'=>true]);}
 public function test_central_role_only_exposes_team_metadata_not_mission_content():void{
  Sanctum::actingAs($this->coord);$this->getJson('/api/v1/support/intake/'.$this->requestId.'/team')->assertOk()->assertJsonMissing(['scope'=>'Périmètre privé']);$this->getJson($this->url())->assertForbidden();$this->getJson('/api/v1/support/missions')->assertForbidden();
 }
 public function test_both_approvals_are_required_and_revocation_cuts_access():void{
  $member=$this->propose();Sanctum::actingAs($this->admin);$this->postJson($this->url().'/team/'.$member.'/decision',['version'=>1,'decision'=>'approved','reason'=>'Vérifié','confirmed'=>true])->assertConflict();
  DB::table('officine_support_assignments')->where('id',$this->assignment)->update(['status'=>'approved']);Sanctum::actingAs($this->staff);$this->getJson($this->url())->assertNotFound();$this->getJson('/api/v1/support/missions')->assertJsonCount(0,'data');
  $this->approve($member);Sanctum::actingAs($this->staff);$this->getJson($this->url())->assertOk()->assertJsonPath('can_lead',true);$this->getJson('/api/v1/support/missions')->assertJsonCount(1,'data');
  DB::table('officine_support_assignments')->where('id',$this->assignment)->update(['status'=>'revoked']);$this->getJson($this->url())->assertForbidden();
 }
 public function test_lead_can_start_suspend_and_resume_with_versioned_history():void{
  $member=$this->propose();$this->approve($member);Sanctum::actingAs($this->staff);$this->transition('start',3)->assertOk();$this->transition('start',3)->assertConflict();$this->transition('suspend',4)->assertOk();$this->transition('resume',5)->assertOk();
  $this->assertDatabaseHas('support_missions',['id'=>$this->mission,'status'=>'active','version'=>6]);$this->assertDatabaseCount('support_mission_events',5);$this->getJson($this->url())->assertJsonCount(5,'events');
 }
 public function test_member_and_office_admin_are_not_implicitly_lead():void{
  $member=$this->propose('member');$this->approve($member);Sanctum::actingAs($this->staff);$this->getJson($this->url())->assertOk()->assertJsonPath('can_lead',false);$this->transition('start',3)->assertNotFound();Sanctum::actingAs($this->admin);$this->getJson($this->url())->assertOk()->assertJsonPath('can_admin',true);$this->transition('start',3)->assertNotFound();
 }
 public function test_expiry_staff_suspension_and_membership_suspension_are_not_bypassed():void{
  $member=$this->propose();$this->approve($member);DB::table('officine_support_assignments')->where('id',$this->assignment)->update(['ends_on'=>now()->subDay()->toDateString()]);Sanctum::actingAs($this->staff);$this->getJson($this->url())->assertForbidden();DB::table('officine_support_assignments')->where('id',$this->assignment)->update(['ends_on'=>now()->addDay()->toDateString()]);$this->staff->forceFill(['internal_active'=>false])->save();Sanctum::actingAs($this->staff);$this->getJson($this->url())->assertForbidden();$this->staff->forceFill(['internal_active'=>true])->save();DB::table('officine_user')->insert(['officine_id'=>$this->office->id,'user_id'=>$this->staff->id,'is_active'=>false,'is_admin'=>false,'permissions'=>'[]']);Sanctum::actingAs($this->staff);$this->getJson($this->url())->assertForbidden();
 }
 public function test_team_revocation_and_permission_removal_apply_immediately():void{
  $member=$this->propose();$this->approve($member);DB::table('officine_support_assignments')->where('id',$this->assignment)->update(['permissions'=>json_encode(['accompagnement.read'])]);Sanctum::actingAs($this->staff);$this->getJson($this->url())->assertOk()->assertJsonPath('can_lead',false);$this->transition('start',3)->assertNotFound();Sanctum::actingAs($this->admin);$this->postJson($this->url().'/team/'.$member.'/decision',['version'=>2,'decision'=>'revoked','reason'=>'Fin de participation','confirmed'=>true])->assertOk();Sanctum::actingAs($this->staff);$this->getJson($this->url())->assertNotFound();$this->assertDatabaseCount('support_mission_team',1);
 }
 public function test_foreign_office_team_and_mission_ids_are_hidden():void{
  $other=Officine::create(['name'=>'Autre','slug'=>'other-workspace','status'=>'active']);DB::table('officine_user')->insert(['user_id'=>$this->admin->id,'officine_id'=>$other->id,'is_admin'=>true,'is_active'=>true,'permissions'=>'[]']);$this->withHeader('X-Officine-ID',(string)$other->id);$this->getJson($this->url())->assertNotFound();$this->getJson('/api/v1/support/missions')->assertJsonCount(0,'data');
 }
}

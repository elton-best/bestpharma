<?php
namespace Tests\Feature;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TeamAccessTest extends TestCase
{
 use RefreshDatabase;
 private User $admin;
 private Officine $office;
 private int $membership;
 protected function setUp(): void {
  parent::setUp();
  $this->admin=User::create(['name'=>'Admin test','email'=>'admin@example.test','password'=>'Fictional12345']);
  $this->office=Officine::create(['name'=>'Office test','slug'=>'office-test','status'=>'active']);
  $this->membership=DB::table('officine_user')->insertGetId(['officine_id'=>$this->office->id,'user_id'=>$this->admin->id,'is_admin'=>true,'is_active'=>true,'permissions'=>'[]']);
  Sanctum::actingAs($this->admin);$this->withHeader('X-Officine-ID',(string)$this->office->id);
 }
 private function role(): int {
  return $this->postJson('/api/v1/team/roles',['name'=>'Quality viewer','permissions'=>['qualite.read']])->assertCreated()->json('id');
 }
 private function invite(array $extra=[]): string {
  return $this->postJson('/api/v1/team/invitations',array_replace(['email'=>'invite@example.test','is_admin'=>false,'role_ids'=>[]],$extra))->assertCreated()->json('invite_token');
 }
 private function guest(): void { $this->app['auth']->forgetGuards(); }
 public function test_last_active_admin_cannot_be_demoted_or_suspended(): void {
  $url='/api/v1/team/members/'.$this->membership;
  $this->putJson($url,['is_admin'=>false,'is_active'=>true,'role_ids'=>[]])->assertConflict();
  $this->putJson($url,['is_admin'=>true,'is_active'=>false,'role_ids'=>[]])->assertConflict();
 }
 public function test_second_admin_allows_demotion_but_not_loss_of_last_one(): void {
  $user=User::create(['name'=>'Second','email'=>'second@example.test','password'=>'Fictional12345']);
  $second=DB::table('officine_user')->insertGetId(['officine_id'=>$this->office->id,'user_id'=>$user->id,'is_admin'=>true,'is_active'=>true,'permissions'=>'[]']);
  $this->putJson('/api/v1/team/members/'.$this->membership,['is_admin'=>false,'is_active'=>true,'role_ids'=>[]])->assertOk();
  Sanctum::actingAs($user);
  $this->putJson('/api/v1/team/members/'.$second,['is_admin'=>false,'is_active'=>true,'role_ids'=>[]])->assertConflict();
 }
 public function test_non_admin_and_suspended_member_are_denied(): void {
  DB::table('officine_user')->where('id',$this->membership)->update(['is_admin'=>false]);
  $this->getJson('/api/v1/team')->assertForbidden();
  DB::table('officine_user')->where('id',$this->membership)->update(['is_admin'=>true,'is_active'=>false]);
  $this->getJson('/api/v1/team')->assertForbidden();
 }
 public function test_role_permissions_are_restricted_and_names_unique(): void {
  $this->role();
  $this->postJson('/api/v1/team/roles',['name'=>'Quality viewer','permissions'=>[]])->assertUnprocessable();
  $this->postJson('/api/v1/team/roles',['name'=>'Unsafe','permissions'=>['clinical.read']])->assertUnprocessable();
 }
 public function test_foreign_roles_members_and_invitations_cannot_be_modified(): void {
  $other=Officine::create(['name'=>'Other','slug'=>'other','status'=>'active']);
  $role=DB::table('officine_roles')->insertGetId(['officine_id'=>$other->id,'name'=>'Other role','permissions'=>'[]']);
  $this->putJson('/api/v1/team/roles/'.$role,['name'=>'Stolen','permissions'=>[],'version'=>1])->assertNotFound();
  $this->putJson('/api/v1/team/members/'.$this->membership,['is_admin'=>true,'is_active'=>true,'role_ids'=>[$role]])->assertUnprocessable();
  $this->postJson('/api/v1/team/invitations',['email'=>'invite@example.test','is_admin'=>false,'role_ids'=>[$role]])->assertUnprocessable();
  $invite=DB::table('officine_invitations')->insertGetId(['officine_id'=>$other->id,'email'=>'other@example.test','token'=>str_repeat('b',64),'roles'=>'[]']);
  $this->deleteJson('/api/v1/team/invitations/'.$invite)->assertNotFound();
 }
 public function test_invitation_is_hashed_and_not_returned_in_listing(): void {
  $token=$this->invite();
  $this->assertDatabaseHas('officine_invitations',['token'=>hash('sha256',$token)]);
  $this->assertDatabaseMissing('officine_invitations',['token'=>$token]);
  $response=$this->getJson('/api/v1/team')->assertOk();
  $this->assertStringNotContainsString($token,$response->getContent());
  $this->assertStringNotContainsString(hash('sha256',$token),$response->getContent());
 }
 public function test_duplicate_members_and_live_invites_are_rejected(): void {
  $this->postJson('/api/v1/team/invitations',['email'=>'admin@example.test','is_admin'=>false,'role_ids'=>[]])->assertConflict();
  $this->invite();
  $this->postJson('/api/v1/team/invitations',['email'=>'invite@example.test','is_admin'=>false,'role_ids'=>[]])->assertConflict();
 }
 public function test_guest_accepts_once_with_invited_roles_and_no_admin_escalation(): void {
  $role=$this->role();$token=$this->invite(['role_ids'=>[$role]]);$this->guest();
  $data=['token'=>$token,'email'=>'invite@example.test','name'=>'Invited user','password'=>'Fictional12345','password_confirmation'=>'Fictional12345','is_admin'=>true];
  $this->postJson('/api/v1/invitations/accept',$data)->assertCreated();
  $user=User::where('email','invite@example.test')->firstOrFail();
  $member=DB::table('officine_user')->where('user_id',$user->id)->first();
  $this->assertFalse((bool)$member->is_admin);
  $this->assertDatabaseHas('officine_member_roles',['membership_id'=>$member->id,'role_id'=>$role]);
  $this->postJson('/api/v1/invitations/accept',$data)->assertUnprocessable();
 }
 public function test_revoked_and_expired_links_cannot_be_used(): void {
  $token=$this->invite();$id=DB::table('officine_invitations')->value('id');
  $this->deleteJson('/api/v1/team/invitations/'.$id)->assertOk();$this->guest();
  $this->postJson('/api/v1/invitations/accept',['token'=>$token,'email'=>'invite@example.test'])->assertUnprocessable();
  DB::table('officine_invitations')->where('id',$id)->update(['revoked_at'=>null,'expires_at'=>now()->subMinute()]);
  $this->postJson('/api/v1/invitations/accept',['token'=>$token,'email'=>'invite@example.test'])->assertUnprocessable();
 }
 public function test_existing_account_requires_matching_authenticated_identity(): void {
  $user=User::create(['name'=>'Existing','email'=>'invite@example.test','password'=>'Fictional12345']);
  $token=$this->invite();
  $this->postJson('/api/v1/invitations/accept',['token'=>$token,'email'=>'invite@example.test'])->assertUnprocessable();
  $this->guest();
  $this->postJson('/api/v1/invitations/accept',['token'=>$token,'email'=>'invite@example.test'])->assertUnprocessable();
  Sanctum::actingAs($user);
  $this->postJson('/api/v1/invitations/accept',['token'=>$token,'email'=>'invite@example.test'])->assertCreated();
 }
 public function test_role_assignment_and_changes_apply_on_next_request(): void {
  $role=$this->role();
  $user=User::create(['name'=>'Member','email'=>'member@example.test','password'=>'Fictional12345']);
  $id=DB::table('officine_user')->insertGetId(['officine_id'=>$this->office->id,'user_id'=>$user->id,'is_admin'=>false,'is_active'=>true,'permissions'=>'[]']);
  DB::table('officine_modules')->insert(['officine_id'=>$this->office->id,'module'=>'qualite','is_active'=>true]);
  $this->putJson('/api/v1/team/members/'.$id,['is_admin'=>false,'is_active'=>true,'role_ids'=>[$role]])->assertOk();
  Sanctum::actingAs($user);$this->getJson('/api/v1/qualite/actions')->assertOk();
  Sanctum::actingAs($this->admin);
  $this->putJson('/api/v1/team/roles/'.$role,['name'=>'Quality viewer','permissions'=>[],'version'=>1])->assertOk();
  Sanctum::actingAs($user);$this->getJson('/api/v1/qualite/actions')->assertForbidden();
 }
}

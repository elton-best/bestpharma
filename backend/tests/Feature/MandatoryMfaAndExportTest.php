<?php
namespace Tests\Feature;
use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use App\Modules\Identity\Services\MfaPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;
class MandatoryMfaAndExportTest extends TestCase {
 use RefreshDatabase;
 private function user(string $email='user@example.test'):User{return User::create(['name'=>'=HYPERLINK("fictif")','email'=>$email,'password'=>'Fictional12345']);}
 protected function setUp():void{parent::setUp();config(['socle.require_privileged_mfa'=>true]);}
 public function test_platform_must_enroll_then_reauthenticate_and_cannot_disable_mfa():void {
  $u=$this->user();$u->forceFill(['is_platform_admin'=>true])->save();$login=$this->postJson('/api/v1/auth/login',['email'=>$u->email,'password'=>'Fictional12345'])->assertOk()->assertJsonPath('mfa_enrollment_required',true)->json('token');$this->withToken($login);
  $this->getJson('/api/v1/platform/summary')->assertForbidden()->assertJsonPath('code','mfa_enrollment_required');$this->getJson('/api/v1/me')->assertOk();$this->getJson('/api/v1/security')->assertOk()->assertJsonPath('mfa_required',true);
  $secret=$this->postJson('/api/v1/security/mfa/setup',['current_password'=>'Fictional12345'])->assertOk()->json('secret');$step=(int)floor(now()->timestamp/30);$this->postJson('/api/v1/security/mfa/confirm',['mfa_code'=>(new Google2FA())->oathTotp($secret,$step)])->assertOk();$this->assertSame(0,$u->tokens()->count());
  $this->app['auth']->forgetGuards();$token=$this->postJson('/api/v1/auth/login',['email'=>$u->email,'password'=>'Fictional12345','mfa_code'=>(new Google2FA())->oathTotp($secret,$step+1)])->assertOk()->json('token');$this->app['auth']->forgetGuards();$this->withToken($token)->getJson('/api/v1/platform/summary')->assertOk();$this->deleteJson('/api/v1/security/mfa',['current_password'=>'Fictional12345'])->assertForbidden();$this->assertNotNull($u->fresh()->mfa_confirmed_at);
 }
 public function test_privilege_assignment_changes_policy_on_next_request_but_ordinary_staff_are_optional():void{
  $u=$this->user();Sanctum::actingAs($u);$this->getJson('/api/v1/applications')->assertOk();$o=Officine::create(['name'=>'Locale','slug'=>'locale','status'=>'active']);$id=DB::table('officine_user')->insertGetId(['user_id'=>$u->id,'officine_id'=>$o->id,'is_admin'=>false,'is_active'=>true,'permissions'=>'[]']);$this->assertFalse(MfaPolicy::required($u));DB::table('officine_user')->where('id',$id)->update(['is_admin'=>true]);$this->getJson('/api/v1/applications')->assertForbidden()->assertJsonPath('code','mfa_enrollment_required');DB::table('officine_user')->where('id',$id)->update(['is_active'=>false]);$this->assertFalse(MfaPolicy::required($u));$u->forceFill(['is_support_staff'=>true])->save();$this->assertFalse(MfaPolicy::required($u));$u->forceFill(['is_support_coordinator'=>true])->save();$this->assertTrue(MfaPolicy::required($u));$u->forceFill(['internal_active'=>false])->save();$this->assertFalse(MfaPolicy::required($u));
 }
 private function owner():array{$u=$this->user();$u->forceFill(['mfa_confirmed_at'=>now()])->save();$o=Officine::create(['name'=>'Locale','slug'=>'locale','status'=>'active']);DB::table('officine_user')->insert(['user_id'=>$u->id,'officine_id'=>$o->id,'is_admin'=>true,'is_active'=>true,'permissions'=>'[]']);Sanctum::actingAs($u);$this->withHeader('X-Officine-ID',(string)$o->id);return [$u,$o];}
 public function test_csv_export_is_filtered_tenant_scoped_formula_safe_and_audited_without_secrets():void{
  [$u,$o]=$this->owner();$foreign=Officine::create(['name'=>'Autre','slug'=>'autre','status'=>'active']);foreach([$o->id,$foreign->id] as $id)DB::table('tenant_audit_logs')->insert(['officine_id'=>$id,'user_id'=>$u->id,'action'=>'team.role.saved','payload'=>json_encode(['role_id'=>9,'password'=>'never-export','token'=>'never-export']),'created_at'=>now(),'updated_at'=>now()]);
  $this->postJson('/api/v1/officine/journal/export',[])->assertUnprocessable();$r=$this->postJson('/api/v1/officine/journal/export',['confirmation'=>true,'action'=>'team.role.saved'])->assertOk()->assertHeader('Content-Type','text/csv; charset=UTF-8')->assertHeader('X-Content-Type-Options','nosniff');$csv=$r->getContent();$this->assertStringNotContainsString('never-export',$csv);$f=fopen('php://temp','r+');fwrite($f,$csv);rewind($f);fgetcsv($f,0,';','"','');$row=fgetcsv($f,0,';','"','');fclose($f);$this->assertSame("'=HYPERLINK(\"fictif\")",$row[3]);$this->assertSame((string)$o->id,$row[5]);$this->assertDatabaseHas('tenant_audit_logs',['officine_id'=>$o->id,'user_id'=>$u->id,'action'=>'journal.exported']);
  DB::table('officine_user')->where('user_id',$u->id)->update(['is_admin'=>false]);$this->postJson('/api/v1/officine/journal/export',['confirmation'=>true])->assertForbidden();
 }
 public function test_platform_export_does_not_include_tenant_business_events_or_private_drafts():void{
  [$u,$o]=$this->owner();$u->forceFill(['is_platform_admin'=>true])->save();Sanctum::actingAs($u);foreach(['team.role.saved','application.draft.created','account.state'] as $action)DB::table('tenant_audit_logs')->insert(['officine_id'=>$o->id,'user_id'=>$u->id,'action'=>$action,'payload'=>'{}','created_at'=>now()]);$r=$this->postJson('/api/v1/platform/journal/export',['confirmation'=>true])->assertOk();$this->assertStringContainsString('account.state',$r->getContent());$this->assertStringNotContainsString('team.role.saved',$r->getContent());$this->assertStringNotContainsString('application.draft.created',$r->getContent());$this->assertDatabaseHas('tenant_audit_logs',['officine_id'=>null,'action'=>'journal.platform_exported']);
 }
 public function test_export_over_limit_is_rejected_without_partial_file_or_success_audit():void{
  [$u,$o]=$this->owner();$row=['officine_id'=>$o->id,'user_id'=>$u->id,'action'=>'team.role.saved','payload'=>'{}','created_at'=>now()];foreach(array_chunk(array_fill(0,5001,$row),500) as $chunk)DB::table('tenant_audit_logs')->insert($chunk);$this->postJson('/api/v1/officine/journal/export',['confirmation'=>true])->assertUnprocessable();$this->assertDatabaseMissing('tenant_audit_logs',['action'=>'journal.exported']);
 }
 public function test_approval_requires_human_authority_check_even_without_documents():void{
  [$u,$o]=$this->owner();$u->forceFill(['is_platform_admin'=>true])->save();Sanctum::actingAs($u);$applicant=$this->user('applicant@example.test');$applicant->forceFill(['email_verified_at'=>now()])->save();$case=Officine::create(['name'=>'Dossier','slug'=>'dossier','status'=>'under_review']);DB::table('officines')->where('id',$case->id)->update(['applicant_user_id'=>$applicant->id]);DB::table('officine_user')->insert(['user_id'=>$applicant->id,'officine_id'=>$case->id,'is_admin'=>false,'is_active'=>true,'permissions'=>'[]']);$url='/api/v1/platform/applications/'.$case->id.'/decision';$this->postJson($url,['version'=>1,'decision'=>'active'])->assertUnprocessable();$this->postJson($url,['version'=>1,'decision'=>'active','habilitation_confirmed'=>false])->assertUnprocessable();$this->postJson($url,['version'=>1,'decision'=>'active','habilitation_confirmed'=>true])->assertOk();$this->assertDatabaseCount('application_documents',0);$payload=json_decode(DB::table('tenant_audit_logs')->where('action','application.active')->value('payload'),true);$this->assertTrue($payload['habilitation_confirmed']);
 }
}

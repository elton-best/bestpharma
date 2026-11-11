<?php
namespace Tests\Feature;
use App\Models\User;
use App\Modules\Identity\Services\IdentitySecurity;
use App\Modules\Identity\Services\SocleMaintenance;
use App\Modules\Identity\Services\Outbox;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;
class SocleMaintenanceTest extends TestCase {
 use RefreshDatabase;
 private function user(string $email):User {return User::create(['email'=>$email,'name'=>'Fictif','password'=>'Fictional12345']);}
 public function test_reminders_are_idempotent_and_never_expose_private_drafts():void {
  $applicant=$this->user('applicant@example.test');$reviewer=$this->user('review@example.test');$reviewer->forceFill(['is_platform_admin'=>true])->save();
  foreach(['pending','draft','corrections_requested'] as $state){$o=Officine::create(['name'=>'Fictive','slug'=>$state,'status'=>$state]);DB::table('officines')->where('id',$o->id)->update(['applicant_user_id'=>$applicant->id,'updated_at'=>now()->subDays(4)]);}
  SocleMaintenance::remind();SocleMaintenance::remind();$this->assertDatabaseCount('notification_outbox',2);
  $this->assertDatabaseHas('notification_outbox',['user_id'=>$applicant->id,'title'=>'Rappel : dossier en attente']);
  $this->assertDatabaseHas('notification_outbox',['user_id'=>$reviewer->id,'title'=>'Rappel : dossier en attente']);
  $this->assertDatabaseMissing('notification_outbox',['officine_id'=>DB::table('officines')->where('status','draft')->value('id')]);
 }
 public function test_token_pruning_defaults_to_dry_run_and_preserves_live_tokens_users_and_audit():void {
  $u=$this->user('user@example.test');IdentitySecurity::issue($u,'verify');$u->createToken('valid',['*'],now()->addHours(8));
  $this->travel(9)->days();IdentitySecurity::issue($u,'reset');$u->createToken('fresh',['*'],now()->addHours(8));
  $counts=SocleMaintenance::prune();$this->assertFalse($counts['applied']);$this->assertSame(1,$counts['identity_tokens']);$this->assertDatabaseCount('identity_tokens',2);
  SocleMaintenance::prune(true);$this->assertDatabaseCount('identity_tokens',1);$this->assertDatabaseCount('personal_access_tokens',1);$this->assertDatabaseCount('users',1);
 }
 public function test_outbox_backoff_and_exhausted_attempts_are_not_retried():void {
  $u=$this->user('user@example.test');Outbox::push($u->id,'future','Test','Fictif');Outbox::push($u->id,'exhausted','Test','Fictif');
  DB::table('notification_outbox')->where('event_key','future')->update(['status'=>'failed','attempts'=>1,'retry_at'=>now()->addHour()]);DB::table('notification_outbox')->where('event_key','exhausted')->update(['status'=>'failed','attempts'=>5]);
  $this->assertSame(['sent'=>0,'failed'=>0,'simulated'=>0],Outbox::dispatch());
 }
}

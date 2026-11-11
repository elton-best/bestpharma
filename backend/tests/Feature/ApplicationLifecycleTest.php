<?php
namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApplicationLifecycleTest extends TestCase
{
    use RefreshDatabase;
    private function payload(array $changes = []): array
    {
        return array_replace([
            'name' => 'Applicant test', 'email' => 'applicant@example.test',
            'password' => 'Fictional12345', 'password_confirmation' => 'Fictional12345',
            'officine_name' => 'Test pharmacy', 'city' => 'Test city', 'phone' => '+2290100000000',
            'address' => 'Fictional address', 'applicant_function' => 'Pharmacien titulaire', 'consent' => true,
        ], $changes);
    }
    private function submit(): int
    {
        $id=$this->postJson('/api/v1/auth/register', $this->payload())->assertCreated()->json('application_id');
        $user=User::where('email','applicant@example.test')->firstOrFail();$user->forceFill(['email_verified_at'=>now()])->save();
        DB::table('officines')->where('id',$id)->update(['department'=>'Ouémé']);Sanctum::actingAs($user);
        $this->postJson('/api/v1/registration-applications/'.$id.'/submit',['version'=>1,'consent'=>true])->assertOk();
        $this->app['auth']->forgetGuards();return $id;
    }
    private function review(string $url,array $data){$id=(int)basename($url);if(basename($url)==='decision')$id=(int)basename(dirname($url));return $this->postJson($url,$data+['habilitation_confirmed'=>true,'version'=>DB::table('officines')->where('id',$id)->value('application_version')]);}
    private function admin(): void
    {
        $admin = User::create(['name' => 'BEG reviewer', 'email' => 'review@example.test', 'password' => 'Fictional12345']);
        $admin->forceFill(['is_platform_admin' => true])->save();
        Sanctum::actingAs($admin);
    }
    public function test_registration_is_pending_and_has_no_business_access(): void
    {
        $id = $this->submit();
        $this->assertDatabaseHas('officines', ['id' => $id, 'status' => 'pending']);
        $this->assertSame([], json_decode(DB::table('officine_user')->where('officine_id', $id)->value('permissions'), true));
        $this->assertDatabaseCount('officine_modules', 0);
        Sanctum::actingAs(User::where('email', 'applicant@example.test')->firstOrFail());
        $this->withHeader('X-Officine-ID', (string) $id)->getJson('/api/v1/qualite/actions')->assertForbidden();
        $this->getJson('/api/v1/applications')->assertOk()->assertJsonCount(1, 'data');
    }
    public function test_registration_rejects_privilege_injection_and_requires_consent(): void
    {
        $this->postJson('/api/v1/auth/register', $this->payload(['is_platform_admin' => true]))->assertUnprocessable()->assertJsonValidationErrors('is_platform_admin');
        $this->postJson('/api/v1/auth/register', $this->payload(['consent' => false]))->assertUnprocessable()->assertJsonValidationErrors('consent');
        $this->assertDatabaseCount('users', 0);
    }
    public function test_only_platform_admin_can_review(): void
    {
        $id = $this->submit();
        $this->getJson('/api/v1/platform/applications')->assertUnauthorized();
        Sanctum::actingAs(User::where('email', 'applicant@example.test')->firstOrFail());
        $this->getJson('/api/v1/platform/applications')->assertForbidden();
        $this->postJson('/api/v1/platform/applications/'.$id.'/decision', ['decision' => 'active'])->assertForbidden();
    }
    public function test_activation_requires_review_and_grants_only_quality_permissions(): void
    {
        $id = $this->submit(); $this->admin();
        $url = '/api/v1/platform/applications/'.$id.'/decision';
        $this->review($url, ['decision' => 'active'])->assertConflict();
        $this->review($url, ['decision' => 'under_review'])->assertOk();
        $this->review($url, ['decision' => 'active'])->assertOk();
        $this->assertDatabaseHas('officines', ['id' => $id, 'status' => 'active']);
        $this->assertDatabaseHas('officine_modules', ['officine_id' => $id, 'module' => 'qualite', 'is_active' => true]);
        $this->assertSame(['qualite.read','qualite.write'], json_decode(DB::table('officine_user')->where('officine_id', $id)->value('permissions'), true));
        $this->review($url, ['decision' => 'active'])->assertConflict();
        $this->assertDatabaseCount('tenant_audit_logs', 4);
    }
    public function test_corrections_require_reason_and_can_only_be_resubmitted_by_applicant(): void
    {
        $id = $this->submit(); $this->admin();
        $url = '/api/v1/platform/applications/'.$id.'/decision';
        $this->review($url, ['decision' => 'under_review'])->assertOk();
        $this->review($url, ['decision' => 'corrections_requested'])->assertUnprocessable();
        $this->review($url, ['decision' => 'corrections_requested', 'note' => 'Adresse à compléter'])->assertOk();
        $other = User::create(['name' => 'Other', 'email' => 'other@example.test', 'password' => 'Fictional12345']);
        Sanctum::actingAs($other);
        $this->getJson('/api/v1/applications')->assertJsonCount(0, 'data');
        $this->putJson('/api/v1/applications/'.$id, $this->payload(['version'=>DB::table('officines')->where('id',$id)->value('application_version')]))->assertNotFound();
        Sanctum::actingAs(User::where('email', 'applicant@example.test')->firstOrFail());
        $this->putJson('/api/v1/applications/'.$id, $this->payload(['address' => 'Updated address','version'=>DB::table('officines')->where('id',$id)->value('application_version')]))->assertOk();
        $this->assertDatabaseHas('officines', ['id' => $id, 'status' => 'pending', 'address' => 'Updated address']);
        $this->putJson('/api/v1/applications/'.$id, $this->payload(['version'=>DB::table('officines')->where('id',$id)->value('application_version')]))->assertConflict();
    }
    public function test_pending_applicant_can_login_to_track_but_not_access_business(): void
    {
        $id = $this->submit();
        $token = $this->postJson('/api/v1/auth/login', ['email' => 'applicant@example.test', 'password' => 'Fictional12345'])->assertOk()->json('token');
        $this->withToken($token)->getJson('/api/v1/applications')->assertOk();
        $this->withHeader('X-Officine-ID', (string) $id)->getJson('/api/v1/qualite/actions')->assertForbidden();
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Qualite\Models\QualityAction;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QualityActionsTest extends TestCase
{
    use RefreshDatabase;
    private User $member;
    private Officine $officine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->member = User::create(['name' => 'Quality tester', 'email' => 'quality@example.test', 'password' => 'development-only']);
        $this->officine = Officine::create(['name' => 'Officine test', 'slug' => 'test', 'status' => 'active']);
        DB::table('officine_user')->insert(['user_id' => $this->member->id, 'officine_id' => $this->officine->id, 'permissions' => json_encode(['qualite.read', 'qualite.write'])]);
        DB::table('officine_modules')->insert(['officine_id' => $this->officine->id, 'module' => 'qualite', 'is_active' => true]);
    }

    private function payload(array $changes = []): array
    {
        return array_replace(['title' => 'Test action', 'chapter' => 'Personnel', 'severity' => 'medium', 'owner' => 'Quality lead', 'due_date' => '2026-12-01', 'status' => 'open', 'description' => 'Fictional test finding.', 'resolution' => null], $changes);
    }
    private function authenticate(): void
    {
        Sanctum::actingAs($this->member);
        $this->withHeader('X-Officine-ID', (string) $this->officine->id);
    }

    public function test_anonymous_access_is_rejected(): void
    {
        $this->getJson('/api/v1/qualite/actions')->assertUnauthorized();
    }
    public function test_members_can_create_list_and_close_an_action(): void
    {
        $this->authenticate();
        $id = $this->postJson('/api/v1/qualite/actions', $this->payload())->assertCreated()->json('data.id');
        $this->getJson('/api/v1/qualite/actions')->assertOk()->assertJsonCount(1, 'data');
        $this->putJson('/api/v1/qualite/actions/'.$id, $this->payload(['status' => 'closed', 'resolution' => 'Reviewed and corrected.']))->assertOk()->assertJsonPath('data.status', 'closed');
        $this->assertDatabaseCount('tenant_audit_logs', 2);
        $this->assertFalse(app()->bound('tenant.officine_id'));
    }
    public function test_closed_action_requires_a_resolution(): void
    {
        $this->authenticate();
        $this->postJson('/api/v1/qualite/actions', $this->payload(['status' => 'closed']))->assertUnprocessable()->assertJsonValidationErrors('resolution');
    }
    public function test_untrusted_tenant_fields_cannot_be_assigned(): void
    {
        $this->authenticate();
        $this->postJson('/api/v1/qualite/actions', $this->payload(['officine_id' => 999]))->assertUnprocessable()->assertJsonValidationErrors('officine_id');
    }
    public function test_other_officine_header_is_rejected(): void
    {
        $this->authenticate();
        $other = Officine::create(['name' => 'Other', 'slug' => 'other', 'status' => 'active']);
        $this->withHeader('X-Officine-ID', (string) $other->id)->getJson('/api/v1/qualite/actions')->assertForbidden();
    }
    public function test_actions_are_isolated_even_when_user_belongs_to_both_officines(): void
    {
        $this->authenticate();
        $id = $this->postJson('/api/v1/qualite/actions', $this->payload())->assertCreated()->json('data.id');
        $other = Officine::create(['name' => 'Other', 'slug' => 'other', 'status' => 'active']);
        DB::table('officine_user')->insert(['user_id' => $this->member->id, 'officine_id' => $other->id, 'permissions' => json_encode(['qualite.read', 'qualite.write'])]);
        DB::table('officine_modules')->insert(['officine_id' => $other->id, 'module' => 'qualite', 'is_active' => true]);
        $this->withHeader('X-Officine-ID', (string) $other->id)->getJson('/api/v1/qualite/actions')->assertOk()->assertJsonCount(0, 'data');
        $this->putJson('/api/v1/qualite/actions/'.$id, $this->payload())->assertNotFound();
        $this->assertFalse(app()->bound('tenant.officine_id'));
    }
    public function test_inactive_officine_or_module_is_rejected(): void
    {
        $this->authenticate();
        $this->officine->update(['status' => 'pending']);
        $this->getJson('/api/v1/qualite/actions')->assertForbidden();
        $this->officine->update(['status' => 'active']);
        DB::table('officine_modules')->update(['is_active' => false]);
        $this->getJson('/api/v1/qualite/actions')->assertForbidden();
    }
    public function test_read_only_member_cannot_write(): void
    {
        $this->authenticate();
        DB::table('officine_user')->update(['permissions' => json_encode(['qualite.read'])]);
        $this->getJson('/api/v1/qualite/actions')->assertOk();
        $this->postJson('/api/v1/qualite/actions', $this->payload())->assertForbidden();
    }

    public function test_bpd_workflow_reports_unavailable_without_a_validated_reference_or_measures(): void
    {
        $this->authenticate();
        $this->getJson('/api/v1/qualite/auto-evaluations')->assertOk()
            ->assertJsonPath('status', 'not_available')
            ->assertJsonPath('available', false)
            ->assertJsonPath('campaigns', [])
            ->assertJsonPath('measurements', [])
            ->assertJsonPath('scoring', null);
    }

    public function test_bpd_workflow_requires_quality_read_permission(): void
    {
        $this->authenticate();
        DB::table('officine_user')->where('officine_id', $this->officine->id)
            ->update(['permissions' => json_encode([])]);
        $this->getJson('/api/v1/qualite/auto-evaluations')->assertForbidden();
    }
    public function test_missing_header_and_missing_permission_are_rejected(): void
    {
        Sanctum::actingAs($this->member);
        $this->getJson('/api/v1/qualite/actions')->assertUnprocessable();
        DB::table('officine_user')->update(['permissions' => '[]']);
        $this->withHeader('X-Officine-ID', (string) $this->officine->id)->getJson('/api/v1/qualite/actions')->assertForbidden();
    }
    public function test_no_context_returns_no_records(): void
    {
        $this->authenticate();
        $this->postJson('/api/v1/qualite/actions', $this->payload())->assertCreated();
        $this->assertSame(0, QualityAction::query()->count());
    }
    public function test_login_and_logout_revoke_the_token(): void
    {
        $token = $this->postJson('/api/v1/auth/login', ['email' => 'quality@example.test', 'password' => 'development-only'])->assertOk()->json('token');
        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}

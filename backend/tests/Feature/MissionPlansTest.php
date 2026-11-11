<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MissionPlansTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $lead;
    private Officine $office;
    private int $mission;
    private string $base;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::create(['name' => 'Admin plan', 'email' => 'admin-plan@example.test', 'password' => 'Fictional12345']);
        $this->lead = User::create(['name' => 'Responsable plan', 'email' => 'lead-plan@example.test', 'password' => 'Fictional12345']);
        $this->lead->forceFill(['is_support_staff' => true])->save();
        $this->office = Officine::create(['name' => 'Officine plan', 'slug' => 'plan-office', 'status' => 'active']);
        DB::table('officine_user')->insert(['user_id' => $this->admin->id, 'officine_id' => $this->office->id, 'is_admin' => true, 'is_active' => true, 'permissions' => '[]']);
        $request = DB::table('support_requests')->insertGetId(['officine_id' => $this->office->id, 'created_by' => $this->admin->id, 'reference' => 'PLAN-REQ', 'request_key' => 'plan-request-000001', 'status' => 'submitted']);
        $this->mission = DB::table('support_missions')->insertGetId(['support_request_id' => $request, 'proposed_by' => $this->lead->id,
            'title' => 'Mission plan', 'scope' => 'Périmètre de recette', 'starts_on' => now()->subDay()->toDateString(),
            'ends_on' => now()->addDays(30)->toDateString(), 'status' => 'active']);
        $assignment = DB::table('officine_support_assignments')->insertGetId(['officine_id' => $this->office->id, 'user_id' => $this->lead->id,
            'proposed_by' => $this->admin->id, 'scope' => 'Mission plan', 'permissions' => json_encode(['accompagnement.read', 'accompagnement.write']),
            'starts_on' => now()->subDay()->toDateString(), 'ends_on' => now()->addDays(30)->toDateString(), 'status' => 'approved',
            'request_key' => 'plan-assignment-0001', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('support_mission_team')->insert(['mission_id' => $this->mission, 'assignment_id' => $assignment, 'role' => 'lead', 'status' => 'approved', 'proposed_by' => $this->admin->id]);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
        Sanctum::actingAs($this->lead);
        $this->base = '/api/v1/support/missions/'.$this->mission.'/plan';
    }

    private function payload(int $version = 0, array $extra = []): array
    {
        return $extra + ['version' => $version, 'title' => 'Plan fictif', 'objectives' => ['Résultat fictif'],
            'starts_on' => now()->toDateString(), 'ends_on' => now()->addDays(10)->toDateString(),
            'items' => [['expected_result' => 'Procédure révisée', 'owner' => 'Responsable qualité', 'due_date' => now()->addDays(5)->toDateString(), 'priority' => 'normal', 'effectiveness_criteria' => 'Vérifier la procédure après mise à jour.']],
            'confirmed' => true];
    }

    public function test_plan_draft_is_private_then_office_can_approve_and_versions_are_preserved(): void
    {
        $this->getJson($this->base)->assertOk()->assertJsonPath('data', null);
        $this->putJson($this->base, $this->payload())->assertOk()->assertJsonPath('data.version', 1);
        Sanctum::actingAs($this->admin);
        $this->getJson($this->base)->assertOk()->assertJsonPath('data', null);
        Sanctum::actingAs($this->lead);
        $this->postJson($this->base.'/submit', ['version' => 1, 'confirmed' => true])->assertOk()->assertJsonPath('status', 'submitted');
        Sanctum::actingAs($this->admin);
        $this->getJson($this->base)->assertOk()->assertJsonPath('data.versions.0.snapshot.title', 'Plan fictif')
            ->assertJsonPath('can_approve', true);
        $this->postJson($this->base.'/decision', ['version' => 2, 'decision' => 'approve', 'confirmed' => true])->assertOk()->assertJsonPath('status', 'approved');
        $this->getJson($this->base)->assertJsonPath('data.versions.0.state', 'approved');
        $this->assertDatabaseCount('support_plan_versions', 1);
    }

    public function test_plan_rejects_foreign_sources_stale_versions_and_unapproved_roles(): void
    {
        $payload = $this->payload();
        $payload['items'][0]['source_finding_id'] = 99999;
        $this->putJson($this->base, $payload)->assertUnprocessable();
        $this->putJson($this->base, $this->payload())->assertOk();
        $this->putJson($this->base, $this->payload())->assertConflict();
        Sanctum::actingAs($this->admin);
        $this->postJson($this->base.'/submit', ['version' => 1, 'confirmed' => true])->assertNotFound();
        $this->assertDatabaseCount('support_plan_versions', 1);
    }

    public function test_plan_period_must_be_inside_mission_period(): void
    {
        $payload = $this->payload();
        $payload['ends_on'] = now()->addDays(31)->toDateString();
        $this->putJson($this->base, $payload)->assertUnprocessable();
        $this->assertDatabaseCount('support_plans', 0);
    }
}

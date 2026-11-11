<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Module4ActionsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Officine $office;
    private int $mission;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::create(['name' => 'Admin M4', 'email' => 'admin-m4@example.test', 'password' => 'Fictional12345']);
        $this->office = Officine::create(['name' => 'Officine M4', 'slug' => 'module4-office', 'status' => 'active']);
        DB::table('officine_user')->insert(['user_id' => $this->admin->id, 'officine_id' => $this->office->id, 'is_admin' => true, 'is_active' => true, 'permissions' => '[]']);
        DB::table('officine_modules')->insert(['officine_id' => $this->office->id, 'module' => 'qualite', 'is_active' => true]);
        $requestId = DB::table('support_requests')->insertGetId(['officine_id' => $this->office->id, 'created_by' => $this->admin->id,
            'reference' => 'M4-REQ', 'request_key' => 'module4-request-key-001', 'status' => 'submitted']);
        $this->mission = DB::table('support_missions')->insertGetId(['support_request_id' => $requestId, 'proposed_by' => $this->admin->id,
            'title' => 'Mission source M4', 'scope' => 'Périmètre de test', 'starts_on' => now()->subDay()->toDateString(),
            'ends_on' => now()->addDays(30)->toDateString(), 'status' => 'active']);
        Sanctum::actingAs($this->admin);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    private function create(): int
    {
        return $this->postJson('/api/v1/qualite/actions-v2/actions', [
            'title' => 'Action M4 de recette', 'description' => 'Description fictive du correctif à réaliser.',
            'effectiveness_criteria' => 'Vérifier la mesure prévue et consigner son résultat.',
            'request_key' => 'create-action-request-key-01',
            'owner_id' => $this->admin->id, 'due_date' => now()->addDays(5)->toDateString(), 'priority' => 'normal',
            'sources' => [['type' => 'mission', 'id' => $this->mission]], 'confirmed' => true,
        ])->assertCreated()->json('data.id');
    }

    public function test_action_requires_documented_evidence_and_effectiveness_before_closure(): void
    {
        $id = $this->create();
        $path = "/api/v1/qualite/actions-v2/actions/{$id}";
        $this->postJson($path.'/start', ['version' => 1, 'confirmed' => true])->assertOk()->assertJsonPath('status', 'in_progress');
        $this->postJson($path.'/complete', ['version' => 2, 'confirmed' => true])->assertOk()->assertJsonPath('status', 'completed');
        $this->postJson($path.'/verify', ['version' => 3, 'decision' => 'accept', 'confirmed' => true])->assertOk()->assertJsonPath('status', 'verified');
        $this->postJson($path.'/close', ['version' => 4, 'reason' => 'Tentative sans preuve', 'confirmed' => true])->assertStatus(409);

        $document = DB::table('documents')->insertGetId(['officine_id' => $this->office->id, 'title' => 'Preuve approuvée', 'kind' => 'record',
            'status' => 'approved', 'version' => 1, 'content' => 'Contenu fictif', 'sha256' => hash('sha256', 'Contenu fictif'), 'created_by' => $this->admin->id, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('document_approvals')->insert(['officine_id' => $this->office->id, 'document_id' => $document, 'version' => 1,
            'approved_by' => $this->admin->id, 'sha256' => hash('sha256', 'Contenu fictif'), 'approved_at' => now()]);
        $this->postJson($path.'/evidence', ['version' => 4, 'document_id' => $document, 'document_version' => 1, 'confirmed' => true])->assertOk();
        $this->postJson($path.'/effectiveness', ['version' => 5, 'effective' => true, 'finding' => 'Résultat vérifié selon le critère documenté.', 'confirmed' => true])->assertOk();
        $this->postJson($path.'/close', ['version' => 6, 'reason' => 'Clôture après preuve et mesure.', 'confirmed' => true])->assertOk()->assertJsonPath('status', 'closed');
        $this->assertDatabaseCount('module4_action_events', 7);
        $this->assertDatabaseHas('module4_action_evidence', ['action_id' => $id, 'document_id' => $document, 'document_version' => 1]);
    }

    public function test_foreign_source_and_stale_version_are_rejected(): void
    {
        $other = Officine::create(['name' => 'Autre M4', 'slug' => 'module4-other', 'status' => 'active']);
        $foreignRequest = DB::table('support_requests')->insertGetId(['officine_id' => $other->id, 'created_by' => $this->admin->id,
            'reference' => 'M4-FOREIGN', 'request_key' => 'module4-foreign-key-01', 'status' => 'submitted']);
        $foreignMission = DB::table('support_missions')->insertGetId(['support_request_id' => $foreignRequest, 'proposed_by' => $this->admin->id,
            'title' => 'Mission étrangère', 'scope' => 'Autre', 'starts_on' => now()->subDay()->toDateString(), 'ends_on' => now()->addDays(30)->toDateString(), 'status' => 'active']);
        $this->postJson('/api/v1/qualite/actions-v2/actions', ['title' => 'Action refusée', 'description' => 'Source hors tenant.', 'owner_id' => $this->admin->id,
            'due_date' => now()->addDays(5)->toDateString(), 'priority' => 'normal', 'sources' => [['type' => 'mission', 'id' => $foreignMission]], 'confirmed' => true])->assertUnprocessable();
        $id = $this->create();
        $path = "/api/v1/qualite/actions-v2/actions/{$id}";
        $this->postJson($path.'/start', ['version' => 1, 'confirmed' => true])->assertOk();
        $this->postJson($path.'/complete', ['version' => 1, 'confirmed' => true])->assertStatus(409);
    }

    public function test_action_creation_replay_returns_one_record_and_rejects_changed_payload(): void
    {
        $id = $this->create();
        $replay = $this->postJson('/api/v1/qualite/actions-v2/actions', [
            'title' => 'Action M4 de recette', 'description' => 'Description fictive du correctif à réaliser.',
            'effectiveness_criteria' => 'Vérifier la mesure prévue et consigner son résultat.',
            'request_key' => 'create-action-request-key-01', 'owner_id' => $this->admin->id,
            'due_date' => now()->addDays(5)->toDateString(), 'priority' => 'normal',
            'sources' => [['type' => 'mission', 'id' => $this->mission]], 'confirmed' => true,
        ])->assertOk();
        self::assertSame($id, $replay->json('data.id'));
        $this->postJson('/api/v1/qualite/actions-v2/actions', [
            'title' => 'Action différente', 'description' => 'Description fictive du correctif à réaliser.',
            'effectiveness_criteria' => 'Vérifier la mesure prévue et consigner son résultat.',
            'request_key' => 'create-action-request-key-01', 'owner_id' => $this->admin->id,
            'due_date' => now()->addDays(5)->toDateString(), 'priority' => 'normal',
            'sources' => [['type' => 'mission', 'id' => $this->mission]], 'confirmed' => true,
        ])->assertConflict();
        $this->assertDatabaseCount('module4_actions', 1);
    }

    public function test_action_plan_versions_and_office_decision_are_explicit(): void
    {
        $create = $this->postJson('/api/v1/qualite/actions-v2/plans', ['title' => 'Plan M4 fictif', 'objective' => 'Objectif de recette.',
            'starts_on' => now()->toDateString(), 'ends_on' => now()->addDays(10)->toDateString(), 'owner_id' => $this->admin->id, 'confirmed' => true])->assertCreated();
        $id = $create->json('data.id');
        $this->putJson("/api/v1/qualite/actions-v2/plans/{$id}", ['version' => 1, 'title' => 'Plan M4 révisé', 'objective' => 'Objectif révisé.',
            'starts_on' => now()->toDateString(), 'ends_on' => now()->addDays(12)->toDateString(), 'owner_id' => $this->admin->id])->assertOk()->assertJsonPath('revision', 2);
        $this->postJson("/api/v1/qualite/actions-v2/plans/{$id}/submit", ['version' => 2, 'confirmed' => true])->assertOk()->assertJsonPath('status', 'submitted');
        $this->postJson("/api/v1/qualite/actions-v2/plans/{$id}/decision", ['version' => 3, 'decision' => 'approve', 'confirmed' => true])->assertOk()->assertJsonPath('status', 'approved');
        $this->assertDatabaseCount('action_plan_versions', 2);
        $this->assertDatabaseHas('action_plan_versions', ['plan_id' => $id, 'revision' => 2, 'status' => 'approved']);
    }

    public function test_approved_m2_plan_import_creates_one_m4_action_source_of_truth(): void
    {
        $m2Plan = DB::table('support_plans')->insertGetId(['mission_id' => $this->mission, 'status' => 'approved', 'version' => 2,
            'created_by' => $this->admin->id, 'created_at' => now(), 'updated_at' => now()]);
        $snapshot = ['title' => 'Plan M2 approuvé', 'objectives' => ['Objectif partagé'], 'starts_on' => now()->toDateString(),
            'ends_on' => now()->addDays(10)->toDateString(), 'items' => [['expected_result' => 'Procédure améliorée', 'owner' => 'Admin M4',
                'due_date' => now()->addDays(5)->toDateString(), 'priority' => 'normal', 'effectiveness_criteria' => 'Mesure de contrôle réalisée et consignée.', 'evidence_expected' => 'Document de suivi']]];
        DB::table('support_plan_versions')->insert(['plan_id' => $m2Plan, 'revision' => 1, 'state' => 'approved', 'snapshot' => json_encode($snapshot),
            'created_by' => $this->admin->id, 'decided_by' => $this->admin->id, 'decision' => 'approve', 'decided_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $path = "/api/v1/qualite/actions-v2/import-mission/{$this->mission}";
        $this->postJson($path, ['confirmed' => true])->assertCreated()->assertJsonPath('created', true);
        $this->postJson($path, ['confirmed' => true])->assertOk()->assertJsonPath('created', false);
        $this->assertDatabaseCount('action_plans', 1);
        $this->assertDatabaseCount('module4_actions', 1);
        $this->assertDatabaseHas('module4_action_sources', ['source_type' => 'mission', 'source_id' => $this->mission]);
    }
}

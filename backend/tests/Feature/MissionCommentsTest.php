<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MissionCommentsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $lead;
    private Officine $office;
    private string $path;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::create(['name' => 'Admin échange', 'email' => 'admin-comments@example.test', 'password' => 'Fictional12345']);
        $this->lead = User::create(['name' => 'Responsable échange', 'email' => 'lead-comments@example.test', 'password' => 'Fictional12345']);
        $this->lead->forceFill(['is_support_staff' => true])->save();
        $this->office = Officine::create(['name' => 'Officine échanges', 'slug' => 'comments-office', 'status' => 'active']);
        DB::table('officine_user')->insert(['user_id' => $this->admin->id, 'officine_id' => $this->office->id, 'is_admin' => true, 'is_active' => true, 'permissions' => '[]']);
        $request = DB::table('support_requests')->insertGetId(['officine_id' => $this->office->id, 'created_by' => $this->admin->id, 'reference' => 'COMMENT-REQ', 'request_key' => 'comments-request-0001', 'status' => 'submitted']);
        $mission = DB::table('support_missions')->insertGetId(['support_request_id' => $request, 'proposed_by' => $this->lead->id, 'title' => 'Mission échanges',
            'scope' => 'Périmètre de recette', 'starts_on' => now()->subDay()->toDateString(), 'ends_on' => now()->addDays(30)->toDateString(), 'status' => 'active']);
        $assignment = DB::table('officine_support_assignments')->insertGetId(['officine_id' => $this->office->id, 'user_id' => $this->lead->id,
            'proposed_by' => $this->admin->id, 'scope' => 'Mission échanges', 'permissions' => json_encode(['accompagnement.read', 'accompagnement.write']),
            'starts_on' => now()->subDay()->toDateString(), 'ends_on' => now()->addDays(30)->toDateString(), 'status' => 'approved',
            'request_key' => 'comments-assignment-01', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('support_mission_team')->insert(['mission_id' => $mission, 'assignment_id' => $assignment, 'role' => 'lead', 'status' => 'approved', 'proposed_by' => $this->admin->id]);
        $this->path = '/api/v1/support/missions/'.$mission.'/comments';
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
        Sanctum::actingAs($this->lead);
    }

    public function test_internal_comments_are_filtered_and_shared_comments_are_notified(): void
    {
        $this->postJson($this->path, ['visibility' => 'internal', 'message' => 'Note réservée à l’équipe.', 'request_key' => 'internal-comment-key-0001', 'confirmed' => true])->assertCreated();
        Sanctum::actingAs($this->admin);
        $this->getJson($this->path)->assertOk()->assertJsonCount(0, 'data');
        $this->postJson($this->path, ['visibility' => 'internal', 'message' => 'Tentative officine', 'request_key' => 'forbidden-comment-key-001', 'confirmed' => true])->assertForbidden();
        Sanctum::actingAs($this->lead);
        $payload = ['visibility' => 'shared', 'message' => 'Message partagé.', 'request_key' => 'shared-comment-key-0001', 'confirmed' => true];
        $first = $this->postJson($this->path, $payload)->assertCreated()->json('data.id');
        $this->postJson($this->path, $payload)->assertOk()->assertJsonPath('data.id', $first);
        $this->postJson($this->path, array_replace($payload, ['message' => 'Autre texte']))->assertConflict();
        Sanctum::actingAs($this->admin);
        $this->getJson($this->path)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.message', 'Message partagé.')
            ->assertJsonMissing(['message' => 'Note réservée à l’équipe.']);
        $this->assertDatabaseHas('notification_outbox', ['officine_id' => $this->office->id, 'title' => 'Nouveau message sur une mission']);
    }

    public function test_foreign_mission_and_unconfirmed_comment_are_rejected(): void
    {
        $this->postJson($this->path, ['visibility' => 'shared', 'message' => 'Sans confirmation', 'request_key' => 'missing-confirmation-key', 'confirmed' => false])->assertUnprocessable();
        $other = Officine::create(['name' => 'Autre officine', 'slug' => 'comments-other-office', 'status' => 'active']);
        DB::table('officine_user')->insert(['user_id' => $this->admin->id, 'officine_id' => $other->id, 'is_admin' => true, 'is_active' => true, 'permissions' => '[]']);
        Sanctum::actingAs($this->admin);
        $this->withHeader('X-Officine-ID', (string) $other->id)->getJson($this->path)->assertNotFound();
        $this->assertDatabaseCount('support_mission_comments', 0);
    }
}

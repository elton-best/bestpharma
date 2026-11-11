<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OfflineSyncTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Officine $office;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::create(['name' => 'Fictif', 'email' => 'sync@example.test', 'password' => 'Fictional12345']);
        $this->office = Officine::create(['name' => 'Locale', 'slug' => 'sync-locale', 'status' => 'active']);
        DB::table('officine_user')->insert([
            'user_id' => $this->user->id,
            'officine_id' => $this->office->id,
            'is_active' => true,
            'is_admin' => true,
            'permissions' => '[]',
        ]);
        DB::table('officine_modules')->insert([
            'officine_id' => $this->office->id,
            'module' => 'accompagnement',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        Sanctum::actingAs($this->user);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    private function operation(?string $id = null, array $payload = [], string $timestamp = '2026-11-03T11:00:00+01:00'): array
    {
        return [
            'operation_id' => $id ?? (string) Str::uuid(),
            'entity' => 'support_request_draft',
            'action' => 'CREATE',
            'client_timestamp' => $timestamp,
            'payload' => $payload + ['title' => 'Besoin fictif', 'description' => 'Description fictive', 'contact' => 'Contact fictif'],
        ];
    }

    public function test_order_and_client_and_server_timestamps_are_preserved_without_claiming_client_time_as_proof(): void
    {
        $first = $this->operation(payload: ['title' => 'Premier']);
        $second = $this->operation(payload: ['title' => 'Second'], timestamp: '2026-11-03T10:05:00-04:00');

        $response = $this->postJson('/api/v1/accompagnement/sync/push', ['operations' => [$first, $second]])->assertOk();

        $response->assertJsonPath('synced_count', 2)
            ->assertJsonPath('operations.0.operation_id', $first['operation_id'])
            ->assertJsonPath('operations.1.operation_id', $second['operation_id'])
            ->assertJsonPath('operations.0.client_timestamp', $first['client_timestamp'])
            ->assertJsonPath('operations.1.client_timestamp', $second['client_timestamp']);
        $this->assertDatabaseCount('support_requests', 2);
        $this->assertDatabaseHas('support_requests', ['title' => 'Premier', 'status' => 'draft']);
        $this->assertDatabaseHas('support_requests', ['title' => 'Second', 'status' => 'draft']);
        $this->assertDatabaseHas('offline_sync_operations', [
            'operation_id' => $first['operation_id'],
            'client_timestamp' => $first['client_timestamp'],
        ]);
        $this->assertNotSame('', $response->json('operations.0.server_received_at'));
        $this->assertSame(2, DB::table('tenant_audit_logs')->where('action', 'support.request.draft_created')->count());
    }

    public function test_replay_after_reconnect_is_idempotent_and_changed_content_conflicts_atomically(): void
    {
        $operation = $this->operation();
        $this->postJson('/api/v1/accompagnement/sync/push', ['operations' => [$operation]])->assertOk()->assertJsonPath('synced_count', 1);

        // A new HTTP request represents reconnect/retry after the client did not receive the ACK.
        $this->postJson('/api/v1/accompagnement/sync/push', ['operations' => [$operation]])
            ->assertOk()->assertJsonPath('synced_count', 0)->assertJsonPath('operations.0.status', 'already_processed');
        $this->assertDatabaseCount('support_requests', 1);
        $this->assertDatabaseCount('offline_sync_operations', 1);

        $conflict = $operation;
        $conflict['payload']['title'] = 'Contenu différent';
        $following = $this->operation();
        $this->postJson('/api/v1/accompagnement/sync/push', ['operations' => [$conflict, $following]])
            ->assertConflict()->assertJsonPath('code', 'sync_conflict');
        $this->assertDatabaseCount('support_requests', 1);
        $this->assertDatabaseCount('offline_sync_operations', 1);
    }

    public function test_sync_rejects_cross_tenant_access_and_keeps_other_tenant_unchanged(): void
    {
        $foreignUser = User::create(['name' => 'Autre', 'email' => 'foreign-sync@example.test', 'password' => 'Fictional12345']);
        $foreignOffice = Officine::create(['name' => 'Étrangère', 'slug' => 'sync-foreign', 'status' => 'active']);
        DB::table('officine_user')->insert([
            'user_id' => $foreignUser->id,
            'officine_id' => $foreignOffice->id,
            'is_active' => true,
            'is_admin' => true,
            'permissions' => '[]',
        ]);
        DB::table('officine_modules')->insert([
            'officine_id' => $foreignOffice->id,
            'module' => 'accompagnement',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withHeader('X-Officine-ID', (string) $foreignOffice->id)
            ->postJson('/api/v1/accompagnement/sync/push', ['operations' => [$this->operation()]])
            ->assertForbidden();
        $this->assertDatabaseCount('support_requests', 0);
        $this->assertDatabaseCount('offline_sync_operations', 0);

        Sanctum::actingAs($foreignUser);
        $this->withHeader('X-Officine-ID', (string) $foreignOffice->id)
            ->postJson('/api/v1/accompagnement/sync/push', ['operations' => [$this->operation()]])
            ->assertOk();
        $this->assertDatabaseHas('support_requests', ['officine_id' => $foreignOffice->id, 'status' => 'draft']);
        $this->assertDatabaseMissing('support_requests', ['officine_id' => $this->office->id]);
    }

    public function test_only_safe_draft_create_operations_are_accepted(): void
    {
        $operation = $this->operation();
        $operation['action'] = 'SUBMIT';
        $this->postJson('/api/v1/accompagnement/sync/push', ['operations' => [$operation]])
            ->assertUnprocessable()->assertJsonPath('code', 'validation_error');
        $this->assertDatabaseCount('support_requests', 0);
    }
}

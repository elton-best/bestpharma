<?php
namespace Tests\Feature;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthorizedDevicesTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $member;
    private Officine $office;
    private Officine $foreignOffice;

    protected function setUp(): void
    {
        parent::setUp();
        config(['socle.require_privileged_mfa' => false]);
        $this->admin = $this->user('admin');
        $this->member = $this->user('member');
        $this->office = Officine::create(['name' => 'Office A', 'slug' => 'device-office-a', 'status' => 'active']);
        $this->foreignOffice = Officine::create(['name' => 'Office B', 'slug' => 'device-office-b', 'status' => 'active']);
        DB::table('officine_user')->insert([
            ['officine_id' => $this->office->id, 'user_id' => $this->admin->id, 'is_admin' => true, 'is_active' => true, 'permissions' => '[]'],
            ['officine_id' => $this->office->id, 'user_id' => $this->member->id, 'is_admin' => false, 'is_active' => true, 'permissions' => '[]'],
        ]);
        DB::table('officine_modules')->insert(['officine_id' => $this->office->id, 'module' => 'tenancy', 'is_active' => true]);
        $this->as($this->admin);
    }

    private function user(string $name): User
    {
        return User::create(['name' => $name, 'email' => $name.'@device.example.test', 'password' => 'Fictional12345']);
    }

    private function as(User $user): void
    {
        Sanctum::actingAs($user);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    private function register(string $fingerprint = 'device-fingerprint-secret-12345678901234567890')
    {
        return $this->postJson('/api/v1/tenancy/devices', ['name' => 'Caisse principale', 'type' => 'caisse', 'fingerprint' => $fingerprint]);
    }

    public function test_device_registration_hashes_identifier_and_audits_transitions_with_version_conflicts(): void
    {
        $fingerprint = 'device-fingerprint-secret-12345678901234567890';
        $created = $this->register($fingerprint)->assertCreated()->assertJsonPath('data.version', 1)->assertJsonMissing(['fingerprint' => $fingerprint]);
        $id = $created->json('data.id');
        $this->assertDatabaseHas('officine_authorized_devices', [
            'id' => $id,
            'officine_id' => $this->office->id,
            'fingerprint_hash' => hash_hmac('sha256', $fingerprint, (string) config('app.key')),
        ]);
        $this->assertDatabaseMissing('officine_authorized_devices', ['fingerprint_hash' => $fingerprint]);
        $this->assertStringNotContainsString($fingerprint, $created->getContent());
        $this->register($fingerprint)->assertConflict();

        $this->postJson('/api/v1/tenancy/devices/'.$id.'/revoke', ['version' => 1])->assertOk()->assertJsonPath('data.is_active', false)->assertJsonPath('data.version', 2);
        $this->postJson('/api/v1/tenancy/devices/'.$id.'/revoke', ['version' => 1])->assertConflict();
        $this->postJson('/api/v1/tenancy/devices/'.$id.'/reactivate', ['version' => 2])->assertOk()->assertJsonPath('data.is_active', true)->assertJsonPath('data.version', 3);
        $this->assertDatabaseHas('tenant_audit_logs', ['officine_id' => $this->office->id, 'action' => 'device.registered']);
        $this->assertDatabaseHas('tenant_audit_logs', ['officine_id' => $this->office->id, 'action' => 'device.revoked']);
        $this->assertDatabaseHas('tenant_audit_logs', ['officine_id' => $this->office->id, 'action' => 'device.reactivated']);
    }

    public function test_active_non_admin_cannot_manage_devices_and_foreign_device_is_not_readable(): void
    {
        $id = $this->register()->assertCreated()->json('data.id');
        DB::table('officine_authorized_devices')->insert([
            'officine_id' => $this->foreignOffice->id, 'name' => 'Foreign', 'type' => 'caisse',
            'fingerprint_hash' => hash('sha256', 'foreign'), 'version' => 1,
        ]);
        $this->getJson('/api/v1/tenancy/devices')->assertOk()->assertJsonCount(1, 'data');
        $this->postJson('/api/v1/tenancy/devices/'.DB::table('officine_authorized_devices')->where('officine_id', $this->foreignOffice->id)->value('id').'/revoke', ['version' => 1])->assertNotFound();

        $this->as($this->member);
        $this->getJson('/api/v1/tenancy/devices')->assertForbidden();
        $this->register('another-device-fingerprint-secret-12345678901234567890')->assertForbidden();
        $this->postJson('/api/v1/tenancy/devices/'.$id.'/revoke', ['version' => 1])->assertForbidden();
    }

    public function test_privileged_mfa_enrollment_gate_applies_to_device_management(): void
    {
        config(['socle.require_privileged_mfa' => true]);
        $this->getJson('/api/v1/tenancy/devices')->assertForbidden()->assertJsonPath('code', 'mfa_enrollment_required');
    }
}

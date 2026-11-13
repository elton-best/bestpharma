<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\PlatformAdmin\Models\BillingEvent;
use App\Modules\PlatformAdmin\Models\Entitlement;
use App\Modules\PlatformAdmin\Models\Plan;
use App\Modules\PlatformAdmin\Models\PlatformSetting;
use App\Modules\PlatformAdmin\Models\Subscription;
use App\Modules\PlatformAdmin\Models\SupportAccessRequest;
use App\Modules\PlatformAdmin\Models\SupportTicket;
use App\Modules\Stock\Models\Product;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Module15AdministrationSaasTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $supportAgent;
    private Officine $office;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('services.billing.webhook_secret', 'test-billing-webhook-secret');
        $this->admin = User::create([
            'name' => 'Admin Officine M15',
            'email' => 'admin-m15@example.test',
            'password' => 'Fictional12345',
        ]);
        // Privileged flags are intentionally excluded from mass assignment.
        $this->admin->forceFill(['is_platform_admin' => true])->save();
        $this->supportAgent = User::create([
            'name' => 'Agent Support N2',
            'email' => 'support-m15@example.test',
            'password' => 'Fictional12345',
        ]);
        $this->office = Officine::create([
            'name' => 'Pharmacie Recette M15',
            'slug' => 'pharmacie-recette-m15',
            'status' => 'active',
        ]);

        DB::table('officine_user')->insert([
            'user_id' => $this->admin->id,
            'officine_id' => $this->office->id,
            'is_admin' => true,
            'is_active' => true,
            'permissions' => '[]',
        ]);
        DB::table('officine_modules')->insert([
            ['officine_id' => $this->office->id, 'module' => 'qualite', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'platformadmin', 'is_active' => true],
        ]);

        Sanctum::actingAs($this->admin);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    public function test_overview_indicators_with_non_disponible_default(): void
    {
        $res = $this->getJson('/api/v1/platformadmin/overview');
        $res->assertOk();
        $res->assertJsonStructure([
            'meta' => ['officine_id', 'as_of', 'period'],
            'kpis' => [
                'active_plans',
                'total_subscriptions',
                'active_subscriptions',
                'suspended_subscriptions',
                'open_tickets',
                'pending_access_requests',
                'audit_events_count',
                'subscription_active_rate',
            ],
        ]);
        $this->assertEquals('non disponible', $res->json('kpis.subscription_active_rate'));
    }

    public function test_plan_subscription_and_idempotent_webhook_activation(): void
    {
        $planRes = $this->postJson('/api/v1/platformadmin/plans', [
            'code' => 'PACK-SMQ-BPD',
            'name' => 'Pack Conformité BPD Complète',
            'description' => 'Accès modules Qualité & Stock',
            'features' => [
                ['module_key' => 'qualite', 'feature_label' => 'SMQ & CAPA', 'limit_value' => 1000],
                ['module_key' => 'stock', 'feature_label' => 'Stocks FEFO & Froid', 'limit_value' => 5000],
            ],
        ]);
        $planRes->assertCreated();
        $planId = $planRes->json('data.id');
        $this->assertNull($planRes->json('data.price_label'));

        $subRes = $this->postJson('/api/v1/platformadmin/subscriptions', [
            'plan_id' => $planId,
            'reference' => 'SUB-2026-001',
        ]);
        $subRes->assertCreated();
        $subId = $subRes->json('data.id');
        $this->assertEquals('en_attente_paiement', $subRes->json('data.status'));

        // Webhook paiement vérifié (CDC 3.2 & 7)
        $webhookPayload = [
            'officine_id' => $this->office->id,
            'subscription_id' => $subId,
            'provider_name' => 'fedapay',
            'provider_event_id' => 'evt-fedapay-998811',
            'event_type' => 'payment_confirmed',
            'amount' => 45000,
        ];
        $sig1 = hash_hmac('sha256', json_encode($webhookPayload, JSON_THROW_ON_ERROR), 'test-billing-webhook-secret');
        $wh1 = $this->withHeaders(['X-Webhook-Signature' => $sig1])->postJson('/api/v1/platformadmin/billing-webhook', $webhookPayload);
        $wh1->assertCreated()->assertJsonPath('replayed', false);

        // Rejeu webhook -> 200 & replayed=true sans double BillingEvent
        $wh2 = $this->withHeaders(['X-Webhook-Signature' => $sig1])->postJson('/api/v1/platformadmin/billing-webhook', $webhookPayload);
        $wh2->assertOk()->assertJsonPath('replayed', true);
        $this->assertEquals(1, BillingEvent::where('provider_event_id', 'evt-fedapay-998811')->count());

        $this->assertDatabaseHas('subscriptions', ['id' => $subId, 'status' => 'active']);
        $this->assertEquals(2, Entitlement::where('officine_id', $this->office->id)->where('is_enabled', true)->count());
    }

    public function test_suspension_retains_all_data_and_disables_entitlements(): void
    {
        $product = Product::create([
            'officine_id' => $this->office->id,
            'code' => 'PROD-KEEP',
            'name' => 'Produit à conserver',
            'version' => 1,
        ]);

        $plan = $this->postJson('/api/v1/platformadmin/plans', [
            'code' => 'PACK-SUSP',
            'name' => 'Pack Test Suspension',
            'features' => [['module_key' => 'stock', 'feature_label' => 'Stocks']],
        ])->json('data');

        $subId = $this->postJson('/api/v1/platformadmin/subscriptions', [
            'plan_id' => $plan['id'],
            'reference' => 'SUB-SUSP-01',
        ])->json('data.id');

        $suspWebhookPayload = [
            'officine_id' => $this->office->id,
            'subscription_id' => $subId,
            'provider_name' => 'fedapay',
            'provider_event_id' => 'evt-susp-01',
            'event_type' => 'payment_confirmed',
        ];
        $suspSig = hash_hmac('sha256', json_encode($suspWebhookPayload, JSON_THROW_ON_ERROR), 'test-billing-webhook-secret');
        $this->withHeaders(['X-Webhook-Signature' => $suspSig])
            ->postJson('/api/v1/platformadmin/billing-webhook', $suspWebhookPayload)
            ->assertCreated();

        // Suspension (CDC 3.6 & 7 : n'efface rien !)
        $suspRes = $this->postJson("/api/v1/platformadmin/subscriptions/{$subId}/state", [
            'action' => 'suspendre',
            'reason' => 'Échéance de renouvellement dépassée.',
        ]);
        $suspRes->assertOk();
        $this->assertEquals('suspendue', $suspRes->json('data.status'));
        $this->assertTrue($suspRes->json('data.data_retained'));
        $this->assertDatabaseHas('products', ['id' => $product->id, 'code' => 'PROD-KEEP']);
        $this->assertDatabaseHas('entitlements', ['subscription_id' => $subId, 'is_enabled' => false]);

        // Réactivation
        $this->postJson("/api/v1/platformadmin/subscriptions/{$subId}/state", [
            'action' => 'reactiver',
            'reason' => 'Régularisation confirmée.',
        ])->assertOk()->assertJsonPath('data.status', 'active');
        $this->assertDatabaseHas('entitlements', ['subscription_id' => $subId, 'is_enabled' => true]);
    }

    public function test_support_agent_without_approved_access_cannot_read_business_data(): void
    {
        // 1. Agent support SANS approbation -> 403 (CDC 7)
        Sanctum::actingAs($this->supportAgent);
        $this->getJson("/api/v1/platformadmin/support-workspace/{$this->office->id}")->assertForbidden();

        // 2. Agent support soumet une demande d'accès temporaire -> toujours 403 avant approbation
        $reqRes = $this->postJson('/api/v1/platformadmin/support-access-requests', [
            'officine_id' => $this->office->id,
            'reason' => 'Diagnostic ticket #INC-402 sur export CSV',
            'requested_scope' => ['reporting.read'],
            'duration_hours' => 4,
        ]);
        $reqRes->assertCreated();
        $reqId = $reqRes->json('data.id');
        $this->getJson("/api/v1/platformadmin/support-workspace/{$this->office->id}")->assertForbidden();

        // 3. Officine admin approuve l'accès -> agent support lit en 200
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/v1/platformadmin/support-access-requests/{$reqId}/decision", [
            'decision' => 'approuve',
        ])->assertOk();

        Sanctum::actingAs($this->supportAgent);
        $this->getJson("/api/v1/platformadmin/support-workspace/{$this->office->id}")
            ->assertOk()
            ->assertJsonPath('access_granted', true);

        // 4. Révocation par l'officine -> refus immédiat 403
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/v1/platformadmin/support-access-requests/{$reqId}/decision", [
            'decision' => 'revoque',
        ])->assertOk();

        Sanctum::actingAs($this->supportAgent);
        $this->getJson("/api/v1/platformadmin/support-workspace/{$this->office->id}")->assertForbidden();
    }

    public function test_settings_and_audit_events_tracking(): void
    {
        $this->postJson('/api/v1/platformadmin/settings', [
            'setting_key' => 'mfa_policy',
            'setting_value' => ['enforce_titulaire' => true, 'session_ttl_minutes' => 120],
        ])->assertOk();

        $auditRes = $this->getJson('/api/v1/platformadmin/audit-events');
        $auditRes->assertOk();
        $this->assertNotEmpty($auditRes->json('data'));
    }

    public function test_billing_webhook_rejects_missing_or_invalid_signature(): void
    {
        $payload = [
            'officine_id' => $this->office->id,
            'subscription_id' => 9999,
            'provider_name' => 'fedapay',
            'provider_event_id' => 'evt-unsigned-01',
            'event_type' => 'payment_confirmed',
        ];

        $this->postJson('/api/v1/platformadmin/billing-webhook', $payload)->assertForbidden();
        $this->withHeaders(['X-Webhook-Signature' => 'invalid-signature'])
            ->postJson('/api/v1/platformadmin/billing-webhook', $payload)
            ->assertForbidden();
    }

    private function actingAsTenantAdmin(): void
    {
        $this->admin->forceFill(['is_platform_admin' => false])->save();
        Sanctum::actingAs($this->admin);
    }

    private function setting(?int $officineId, string $value): PlatformSetting
    {
        return PlatformSetting::create([
            'officine_id' => $officineId,
            'setting_key' => 'mfa_policy',
            'setting_value' => ['secret' => $value],
            'updated_by_user_id' => $this->admin->id,
            'version' => 1,
        ]);
    }

    public function test_tenant_admin_cannot_create_global_plans_even_through_quality_alias(): void
    {
        $this->actingAsTenantAdmin();
        foreach (['/api/v1/platformadmin', '/api/v1/qualite/platformadmin'] as $base) {
            $this->postJson($base.'/plans', [
                'code' => 'FORBIDDEN', 'name' => 'Global plan',
            ])->assertForbidden();
        }
        $this->assertDatabaseMissing('plans', ['code' => 'FORBIDDEN']);
        $this->assertDatabaseMissing('audit_events', ['event_type' => 'plan.created']);
    }

    public function test_tenant_admin_cannot_read_or_update_global_settings_via_query_or_body(): void
    {
        $global = $this->setting(null, 'global-secret');
        $this->actingAsTenantAdmin();

        foreach (['/api/v1/platformadmin', '/api/v1/qualite/platformadmin'] as $base) {
            $this->getJson($base.'/settings?scope=global')->assertForbidden()
                ->assertDontSee('global-secret');
            $this->postJson($base.'/settings?scope=global', [
                'setting_key' => 'mfa_policy', 'setting_value' => ['secret' => 'changed'],
            ])->assertForbidden();
            $this->postJson($base.'/settings', [
                'scope' => 'global', 'setting_key' => 'mfa_policy', 'setting_value' => ['secret' => 'changed'],
            ])->assertForbidden();
            $this->postJson($base.'/settings', [
                'scope' => 'global', 'setting_key' => 'new_global', 'setting_value' => ['value' => true],
            ])->assertForbidden();
        }

        $this->assertSame(['secret' => 'global-secret'], $global->fresh()->setting_value);
        $this->assertSame(1, $global->fresh()->version);
        $this->assertDatabaseCount('platform_settings', 1);
        $this->assertDatabaseMissing('audit_events', ['event_type' => 'setting.updated']);
    }

    public function test_tenant_permission_strings_do_not_grant_platform_authority(): void
    {
        $this->actingAsTenantAdmin();
        DB::table('officine_user')->where('user_id', $this->admin->id)->update([
            'is_admin' => false,
            'permissions' => json_encode(['admin', 'platformadmin.read', 'platformadmin.write']),
        ]);
        $this->postJson('/api/v1/platformadmin/plans', [
            'code' => 'FORGED', 'name' => 'Forbidden plan',
        ])->assertForbidden();
        $this->getJson('/api/v1/platformadmin/settings?scope=global')->assertForbidden();
        $this->postJson('/api/v1/platformadmin/settings', [
            'scope' => 'global', 'setting_key' => 'secret', 'setting_value' => ['value' => true],
        ])->assertForbidden();
    }

    public function test_platform_admin_can_create_read_and_update_global_settings(): void
    {
        $this->setting($this->office->id, 'local-value');
        $payload = ['scope' => 'global', 'setting_key' => 'mfa_policy', 'setting_value' => ['secret' => 'global-value']];
        $id = $this->postJson('/api/v1/platformadmin/settings', $payload)
            ->assertOk()->assertJsonPath('data.officine_id', null)->json('data.id');
        $payload['setting_value'] = ['secret' => 'updated-global-value'];
        $this->postJson('/api/v1/platformadmin/settings', $payload)->assertOk()
            ->assertJsonPath('data.id', $id)->assertJsonPath('data.version', 2);
        $this->getJson('/api/v1/platformadmin/settings?scope=global')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.setting_value.secret', 'updated-global-value')
            ->assertDontSee('local-value');
        $this->assertDatabaseCount('platform_settings', 2);
    }

    public function test_tenant_settings_use_validated_context_not_payload_ids_and_reject_invalid_scope(): void
    {
        $other = Officine::create(['name' => 'Other M15', 'slug' => 'other-settings-m15', 'status' => 'active']);
        $global = $this->setting(null, 'global-secret');
        $foreign = $this->setting($other->id, 'foreign-secret');
        $this->actingAsTenantAdmin();

        $this->postJson('/api/v1/platformadmin/settings', [
            'officine_id' => $other->id, 'id' => $global->id,
            'setting_key' => 'mfa_policy', 'setting_value' => ['secret' => 'own-value'],
        ])->assertOk()->assertJsonPath('data.officine_id', $this->office->id);
        $this->postJson('/api/v1/platformadmin/settings', [
            'scope' => 'tenant', 'officine_id' => null,
            'setting_key' => 'mfa_policy', 'setting_value' => ['secret' => 'own-value'],
        ])->assertOk()->assertJsonPath('data.officine_id', $this->office->id)->assertJsonPath('data.version', 2);
        $this->getJson('/api/v1/platformadmin/settings?officine_id='.$other->id)->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.setting_value.secret', 'own-value')
            ->assertDontSee('foreign-secret')->assertDontSee('global-secret');
        foreach (['GLOBAL', '', 'unknown', ['global']] as $scope) {
            $this->postJson('/api/v1/platformadmin/settings', [
                'scope' => $scope, 'setting_key' => 'mfa_policy', 'setting_value' => ['secret' => 'invalid'],
            ])->assertUnprocessable();
        }
        $this->withHeader('X-Officine-ID', (string) $other->id)
            ->getJson('/api/v1/platformadmin/settings')->assertForbidden();
        $this->assertSame(['secret' => 'foreign-secret'], $foreign->fresh()->setting_value);
        $this->assertSame(['secret' => 'global-secret'], $global->fresh()->setting_value);
    }

    public function test_tenant_admin_keeps_catalog_subscription_ticket_and_access_decision_operations(): void
    {
        $plan = Plan::create(['code' => 'LOCAL-CATALOG', 'name' => 'Public catalogue']);
        $this->actingAsTenantAdmin();
        $this->getJson('/api/v1/platformadmin/plans')->assertOk()->assertJsonPath('data.0.id', $plan->id);
        $subId = $this->postJson('/api/v1/platformadmin/subscriptions', [
            'plan_id' => $plan->id, 'reference' => 'LOCAL-SUB',
        ])->assertCreated()->assertJsonPath('data.officine_id', $this->office->id)->json('data.id');
        $this->postJson("/api/v1/platformadmin/subscriptions/{$subId}/state", [
            'action' => 'suspendre', 'reason' => 'Local cancellation request',
        ])->assertOk();
        $ticketId = $this->postJson('/api/v1/platformadmin/tickets', [
            'reference' => 'LOCAL-TICKET', 'subject' => 'Local issue', 'description' => 'Tenant request',
        ])->assertCreated()->json('data.id');
        Sanctum::actingAs($this->supportAgent);
        $accessId = $this->postJson('/api/v1/platformadmin/support-access-requests', [
            'officine_id' => $this->office->id, 'ticket_id' => $ticketId,
            'reason' => 'Investigate local issue', 'requested_scope' => ['reporting.read'],
        ])->assertCreated()->json('data.id');
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/v1/platformadmin/support-access-requests/{$accessId}/decision", [
            'decision' => 'approuve',
        ])->assertOk();
        $this->getJson('/api/v1/platformadmin/subscriptions')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/platformadmin/tickets')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_cross_tenant_subscription_and_support_relations_are_not_accessible(): void
    {
        $other = Officine::create(['name' => 'Other M15', 'slug' => 'other-relations-m15', 'status' => 'active']);
        $plan = Plan::create(['code' => 'CROSS-CATALOG', 'name' => 'Catalogue']);
        $foreignSub = Subscription::create([
            'officine_id' => $other->id, 'plan_id' => $plan->id, 'reference' => 'FOREIGN-SUB', 'status' => 'active',
        ]);
        $foreignTicket = SupportTicket::create([
            'officine_id' => $other->id, 'reference' => 'FOREIGN-TICKET', 'subject' => 'foreign-secret',
            'description' => 'private', 'opened_by_user_id' => $this->admin->id,
        ]);
        $foreignAccess = SupportAccessRequest::create([
            'officine_id' => $other->id, 'requester_user_id' => $this->supportAgent->id,
            'reason' => 'Foreign access', 'requested_scope' => ['reporting.read'],
        ]);
        $this->actingAsTenantAdmin();
        $this->postJson("/api/v1/platformadmin/subscriptions/{$foreignSub->id}/state", [
            'action' => 'suspendre', 'reason' => 'Cross tenant attempt',
        ])->assertNotFound();
        $this->postJson("/api/v1/platformadmin/support-access-requests/{$foreignAccess->id}/decision", [
            'decision' => 'approuve',
        ])->assertNotFound();
        $this->postJson('/api/v1/platformadmin/support-access-requests', [
            'officine_id' => $this->office->id, 'ticket_id' => $foreignTicket->id,
            'reason' => 'Cross tenant ticket', 'requested_scope' => ['reporting.read'],
        ])->assertNotFound();

        // Legacy inconsistent references must not expose the foreign ticket.
        SupportAccessRequest::create([
            'officine_id' => $this->office->id, 'ticket_id' => $foreignTicket->id,
            'requester_user_id' => $this->supportAgent->id, 'reason' => 'Legacy relation', 'requested_scope' => [],
        ]);
        $this->getJson('/api/v1/platformadmin/support-access-requests')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.ticket', null)->assertDontSee('foreign-secret');
        $this->getJson('/api/v1/platformadmin/subscriptions')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/platformadmin/tickets')->assertOk()->assertJsonCount(0, 'data');
        $this->assertSame('active', $foreignSub->fresh()->status);
        $this->assertSame('en_attente', $foreignAccess->fresh()->status);

        $ownTicket = SupportTicket::create([
            'officine_id' => $this->office->id, 'reference' => 'OWN-TICKET', 'subject' => 'Local issue',
            'description' => 'Local request', 'opened_by_user_id' => $this->admin->id,
        ]);
        $foreignAccess->update(['ticket_id' => $ownTicket->id]);
        $this->getJson('/api/v1/platformadmin/tickets')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonCount(0, 'data.0.access_requests');
    }
}

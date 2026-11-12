<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\PlatformAdmin\Models\BillingEvent;
use App\Modules\PlatformAdmin\Models\Entitlement;
use App\Modules\PlatformAdmin\Models\Subscription;
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
            'is_platform_admin' => true,
        ]);
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
}

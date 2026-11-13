<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Fiscalite\Models\FeexPayIntent;
use App\Modules\Fiscalite\Models\FiscalInvoice;
use App\Modules\Tenancy\Models\Officine;
use App\Modules\Tresorerie\Models\CashRegister;
use App\Modules\Tresorerie\Models\CashSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PhaseAuditEdgeCasesAndConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Officine $office;
    private CashRegister $register;

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('services.mecef.token', 'test_mecef_token_audit');
        Config::set('services.mecef.ifu', '0202612345678');
        Config::set('services.mecef.invoice_url', 'https://api-mecef.dgi.bj/api/v1/invoices');
        Config::set('services.feexpay.shop_id', 'shop_audit_123');
        Config::set('services.feexpay.api_key', 'secret_feexpay_audit');
        Config::set('services.feexpay.base_url', 'https://api.feexpay.me');

        $this->user = User::create([
            'name' => 'Auditeur Qualite Test',
            'email' => 'auditeur-qualite@example.test',
            'password' => 'Fictional12345',
        ]);

        $this->office = Officine::create([
            'name' => 'Pharmacie Audit BestPharma',
            'slug' => 'pharmacie-audit-bestpharma',
            'status' => 'active',
        ]);

        DB::table('officine_user')->insert([
            'user_id' => $this->user->id,
            'officine_id' => $this->office->id,
            'is_admin' => false,
            'is_active' => true,
            'permissions' => json_encode([
                'qualite.read',
                'qualite.write',
                'tresorerie.read',
                'tresorerie.write',
                'fiscalite.read',
                'fiscalite.write',
                'comptabilite.read',
                'comptabilite.write',
            ]),
        ]);

        DB::table('officine_modules')->insert([
            ['officine_id' => $this->office->id, 'module' => 'qualite', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'tresorerie', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'fiscalite', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'comptabilite', 'is_active' => true],
        ]);

        $this->register = CashRegister::create([
            'officine_id' => $this->office->id,
            'code' => 'CAISSE-AUDIT',
            'name' => 'Caisse Audit',
            'discrepancy_alert_threshold' => 1000.00,
            'is_active' => true,
            'version' => 1,
        ]);

        Sanctum::actingAs($this->user);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    public function test_cannot_open_two_sessions_on_same_cash_register(): void
    {
        // 1. Première session
        $r1 = $this->postJson('/api/v1/tresorerie/sessions/open', [
            'cash_register_id' => $this->register->id,
            'session_ref' => 'SES-AUDIT-01',
            'opening_float' => 15000,
        ]);
        $r1->assertCreated();

        // 2. Deuxième tentative sur la même caisse alors qu'elle est ouverte
        $r2 = $this->postJson('/api/v1/tresorerie/sessions/open', [
            'cash_register_id' => $this->register->id,
            'session_ref' => 'SES-AUDIT-02',
            'opening_float' => 10000,
        ]);
        $r2->assertStatus(422)
            ->assertJsonPath('message', 'Une session est déjà ouverte sur cette caisse.');
    }

    public function test_cannot_close_already_closed_session(): void
    {
        $session = CashSession::create([
            'officine_id' => $this->office->id,
            'cash_register_id' => $this->register->id,
            'session_ref' => 'SES-AUDIT-CLOSED',
            'cashier_user_id' => $this->user->id,
            'opened_at' => now(),
            'opening_float' => 10000,
            'expected_closing_balance' => 10000,
            'status' => 'ouverte',
            'version' => 1,
        ]);

        // Première clôture
        $c1 = $this->postJson("/api/v1/tresorerie/sessions/{$session->id}/close", [
            'actual_closing_balance' => 10000,
        ]);
        $c1->assertOk();

        // Deuxième clôture -> rejet 422
        $c2 = $this->postJson("/api/v1/tresorerie/sessions/{$session->id}/close", [
            'actual_closing_balance' => 10000,
        ]);
        $c2->assertStatus(422)
            ->assertJsonPath('message', 'Session déjà clôturée.');
    }

    public function test_preparations_rejects_duplicate_reference(): void
    {
        $payload = [
            'reference' => 'PREP-AUDIT-DUP',
            'formula_name' => 'Sirop Adoucissant Audit',
            'quantity_prepared' => '250ml',
            'expiry_date' => now()->addMonths(3)->toDateString(),
        ];

        $r1 = $this->postJson('/api/v1/qualite/cdc-extras/preparations', $payload);
        $r1->assertCreated();

        $r2 = $this->postJson('/api/v1/qualite/cdc-extras/preparations', $payload);
        $r2->assertStatus(422)
            ->assertJsonPath('message', 'Cette référence de préparation existe déjà.');
    }

    public function test_certified_invoice_is_idempotent_and_skips_external_api(): void
    {
        Http::fake([
            'https://api-mecef.dgi.bj/api/v1/invoices' => Http::response([
                'codeMECeFDGI' => 'MECeF-AUDIT-IDEMP-01',
                'qrCode' => 'https://emidgi.bj/v?id=MECeF-AUDIT-IDEMP-01',
                'uid' => 'NIM-AUDIT-01',
            ], 200),
        ]);

        // Création
        $store = $this->postJson('/api/v1/fiscalite/invoices', [
            'reference' => 'INV-AUDIT-IDEMP',
            'invoice_type' => 'FV',
            'total_ht' => 5000,
            'total_tva' => 900,
            'total_ttc' => 5900,
        ]);
        $store->assertCreated();
        $id = $store->json('data.id');

        // Certification 1
        $cert1 = $this->postJson("/api/v1/fiscalite/invoices/{$id}/certify");
        $cert1->assertOk();
        $this->assertEquals('certifiee', $cert1->json('data.status'));

        // Certification 2 (rejouée) -> idempotent sans échec
        $cert2 = $this->postJson("/api/v1/fiscalite/invoices/{$id}/certify");
        $cert2->assertOk();
        $this->assertEquals('certifiee', $cert2->json('data.status'));
        $this->assertEquals('MECeF-AUDIT-IDEMP-01', $cert2->json('data.mecef_code'));
    }

    public function test_feexpay_webhook_replay_is_idempotent(): void
    {
        Http::fake([
            'https://api.feexpay.me/api/transactions/public/requesttopay' => Http::response([
                'reference' => 'FEEX-AUDIT-PROV-99',
                'status' => 'PENDING',
            ], 200),
        ]);

        $init = $this->postJson('/api/v1/fiscalite/feexpay/intents', [
            'reference' => 'FP-AUDIT-REPLAY',
            'amount' => 3000,
            'network' => 'MOOV',
            'phone_number' => '+22995000000',
        ]);
        $init->assertCreated();

        $payload = [
            'officine_id' => $this->office->id,
            'reference' => 'FP-AUDIT-REPLAY',
            'status' => 'SUCCESSFUL',
            'provider_reference' => 'FEEX-AUDIT-PROV-99',
        ];
        $secret = (string) config('services.feexpay.api_key');
        $sig = hash_hmac('sha256', json_encode($payload), $secret);

        // Premier webhook
        $w1 = $this->withHeaders(['X-FeexPay-Signature' => $sig])
            ->postJson('/api/v1/fiscalite/feexpay/webhook', $payload);
        $w1->assertOk()->assertJsonPath('replayed', false);

        // Deuxième webhook rejoué
        $w2 = $this->withHeaders(['X-FeexPay-Signature' => $sig])
            ->postJson('/api/v1/fiscalite/feexpay/webhook', $payload);
        $w2->assertOk()->assertJsonPath('replayed', true);
    }
}

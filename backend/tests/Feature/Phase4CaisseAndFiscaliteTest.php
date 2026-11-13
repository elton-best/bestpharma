<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Fiscalite\Models\FeexPayIntent;
use App\Modules\Fiscalite\Models\FiscalInvoice;
use App\Modules\Tenancy\Models\Officine;
use App\Modules\Tresorerie\Models\CashRegister;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Phase4CaisseAndFiscaliteTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Officine $office;
    private CashRegister $register;

    protected function setUp(): void
    {
        parent::setUp();

        // Configurer les connecteurs pour le test
        Config::set('services.mecef.token', 'test_mecef_token_12345');
        Config::set('services.mecef.ifu', '0202612345678');
        Config::set('services.mecef.invoice_url', 'https://api-mecef.dgi.bj/api/v1/invoices');
        Config::set('services.mecef.mode', 'test');

        Config::set('services.feexpay.shop_id', 'shop_test_67890');
        Config::set('services.feexpay.api_key', 'secret_feexpay_key_test');
        Config::set('services.feexpay.base_url', 'https://api.feexpay.me');
        Config::set('services.feexpay.mode', 'SANDBOX');

        $this->user = User::create([
            'name' => 'Comptable Phase 4',
            'email' => 'phase4-compta@example.test',
            'password' => 'Fictional12345',
        ]);

        $this->office = Officine::create([
            'name' => 'Pharmacie Recette Phase 4',
            'slug' => 'pharmacie-recette-phase-4',
            'status' => 'active',
        ]);

        DB::table('officine_user')->insert([
            'user_id' => $this->user->id,
            'officine_id' => $this->office->id,
            'is_admin' => false,
            'is_active' => true,
            'permissions' => json_encode([
                'tresorerie.read',
                'tresorerie.write',
                'fiscalite.read',
                'fiscalite.write',
                'comptabilite.read',
                'comptabilite.write',
            ]),
        ]);

        DB::table('officine_modules')->insert([
            ['officine_id' => $this->office->id, 'module' => 'tresorerie', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'fiscalite', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'comptabilite', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'qualite', 'is_active' => true],
        ]);

        $this->register = CashRegister::create([
            'officine_id' => $this->office->id,
            'code' => 'CAISSE-P4',
            'name' => 'Caisse Phase 4 Test',
            'discrepancy_alert_threshold' => 1000.00,
            'is_active' => true,
            'version' => 1,
        ]);

        Sanctum::actingAs($this->user);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    public function test_cash_session_lifecycle_and_syscohada_sync(): void
    {
        // 1. Ouvrir une session de caisse
        $openRes = $this->postJson('/api/v1/tresorerie/sessions/open', [
            'cash_register_id' => $this->register->id,
            'session_ref' => 'SES-P4-001',
            'opening_float' => 10000,
        ]);
        $openRes->assertCreated();
        $sessionId = $openRes->json('data.id');

        // 2. Clôturer la session de caisse
        $closeRes = $this->postJson("/api/v1/tresorerie/sessions/{$sessionId}/close", [
            'actual_closing_balance' => 10000,
            'discrepancy_justification' => null,
        ]);
        $closeRes->assertOk();
        $this->assertEquals('cloturee', $closeRes->json('data.status'));
        $this->assertEquals(0, $closeRes->json('data.discrepancy_amount'));
    }

    public function test_fiscal_invoice_creation_and_certification(): void
    {
        Http::fake([
            'https://api-mecef.dgi.bj/api/v1/invoices' => Http::response([
                'codeMECeFDGI' => 'MECeF-2026-TEST-998877',
                'qrCode' => 'https://emidgi.bj/v?id=MECeF-2026-TEST-998877',
                'uid' => 'NIM-2026-0001',
                'counters' => ['FV' => 1],
            ], 200),
        ]);

        // 1. Créer une facture normalisée
        $storeRes = $this->postJson('/api/v1/fiscalite/invoices', [
            'reference' => 'INV-P4-001',
            'invoice_type' => 'FV',
            'customer_name' => 'Client Test Bénin',
            'customer_ifu' => '0202612345678',
            'total_ht' => 10000,
            'total_tva' => 1800,
            'total_ttc' => 11800,
            'idempotency_key' => 'idem-inv-p4-001',
        ]);
        $storeRes->assertCreated();
        $invoiceId = $storeRes->json('data.id');
        $this->assertEquals('brouillon', $storeRes->json('data.status'));

        // 2. Certifier e-MECEF
        $certRes = $this->postJson("/api/v1/fiscalite/invoices/{$invoiceId}/certify");
        $certRes->assertOk();
        $this->assertEquals('certifiee', $certRes->json('data.status'));
        $this->assertEquals('MECeF-2026-TEST-998877', $certRes->json('data.mecef_code'));
        $this->assertEquals('https://emidgi.bj/v?id=MECeF-2026-TEST-998877', $certRes->json('data.mecef_qr_data'));
    }

    public function test_feexpay_intent_and_hmac_webhook(): void
    {
        Http::fake([
            'https://api.feexpay.me/api/transactions/public/requesttopay' => Http::response([
                'reference' => 'FEEX-PROVIDER-REF-1234',
                'status' => 'PENDING',
            ], 200),
        ]);

        // 1. Initier un paiement Mobile Money
        $initRes = $this->postJson('/api/v1/fiscalite/feexpay/intents', [
            'reference' => 'FP-P4-001',
            'amount' => 5000,
            'network' => 'MTN',
            'phone_number' => '+22997000000',
        ]);
        $initRes->assertCreated();
        $this->assertEquals('en_attente', $initRes->json('data.status'));
        $this->assertEquals('FEEX-PROVIDER-REF-1234', $initRes->json('data.provider_reference'));

        // 2. Simuler le webhook avec signature HMAC
        $payload = [
            'officine_id' => $this->office->id,
            'reference' => 'FP-P4-001',
            'status' => 'SUCCESSFUL',
            'provider_reference' => 'FEEX-PROVIDER-REF-1234',
        ];
        $payloadJson = json_encode($payload);
        $secret = (string) config('services.feexpay.api_key');
        $signature = hash_hmac('sha256', $payloadJson, $secret);

        $webhookRes = $this->withHeaders([
            'X-FeexPay-Signature' => $signature,
        ])->postJson('/api/v1/fiscalite/feexpay/webhook', $payload);

        $webhookRes->assertOk();

        // 3. Vérifier la mise à jour en base
        $intent = FeexPayIntent::where('reference', 'FP-P4-001')->first();
        $this->assertNotNull($intent);
        $this->assertEquals('confirme', $intent->status);
    }
}

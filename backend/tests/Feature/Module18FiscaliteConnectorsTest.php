<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Dispensation\Models\Sale;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Module18FiscaliteConnectorsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $limitedMember;
    private Officine $office;
    private Officine $otherOffice;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Admin Fiscalite M18',
            'email' => 'admin-fiscal@example.test',
            'password' => 'Fictional12345',
        ]);
        $this->limitedMember = User::create([
            'name' => 'Membre Sans Droit Fiscal',
            'email' => 'limited-fiscal@example.test',
            'password' => 'Fictional12345',
        ]);

        $this->office = Officine::create([
            'name' => 'Pharmacie e-MECEF Bénin',
            'slug' => 'pharmacie-emecef-benin',
            'status' => 'active',
        ]);
        $this->otherOffice = Officine::create([
            'name' => 'Pharmacie Voisine Fiscal',
            'slug' => 'pharmacie-voisine-fiscal',
            'status' => 'active',
        ]);

        DB::table('officine_user')->insert([
            [
                'user_id' => $this->admin->id,
                'officine_id' => $this->office->id,
                'is_admin' => true,
                'is_active' => true,
                'permissions' => '[]',
            ],
            [
                'user_id' => $this->limitedMember->id,
                'officine_id' => $this->office->id,
                'is_admin' => false,
                'is_active' => true,
                'permissions' => '[]',
            ],
        ]);

        DB::table('officine_modules')->insert([
            ['officine_id' => $this->office->id, 'module' => 'fiscalite', 'is_active' => true],
        ]);

        Sanctum::actingAs($this->admin);
        $this->withHeaders(['X-Officine-ID' => (string) $this->office->id]);
    }

    public function test_rbac_strict_and_missing_connector_credentials_reject_cleanly(): void
    {
        Sanctum::actingAs($this->limitedMember);
        $this->withHeaders(['X-Officine-ID' => (string) $this->office->id])
            ->getJson('/api/v1/fiscalite/overview')
            ->assertForbidden();

        Sanctum::actingAs($this->admin);
        Config::set('services.mecef.token', null);
        Config::set('services.mecef.ifu', null);
        Config::set('services.feexpay.shop_id', null);
        Config::set('services.feexpay.api_key', null);

        $this->getJson('/api/v1/fiscalite/overview')
            ->assertOk()
            ->assertJsonPath('connectors.mecef.configured', false)
            ->assertJsonPath('connectors.feexpay.configured', false);

        $inv = $this->postJson('/api/v1/fiscalite/invoices', [
            'reference' => 'FAC-NOCONF-01',
            'total_ht' => 10000,
            'total_tva' => 0,
            'total_ttc' => 10000,
        ])->assertCreated();

        // Pas de faux code MECeF généré si non configuré -> 422
        $this->postJson("/api/v1/fiscalite/invoices/{$inv->json('data.id')}/certify")
            ->assertStatus(422);

        $this->postJson('/api/v1/fiscalite/feexpay/intents', [
            'reference' => 'FP-NOCONF-01',
            'amount' => 5000,
            'network' => 'MTN',
            'phone_number' => '22997000001',
        ])->assertStatus(422);
    }

    public function test_mecef_certification_and_feexpay_webhook_hmac_idempotency(): void
    {
        Config::set('services.mecef.token', 'mecef-test-token');
        Config::set('services.mecef.ifu', '3202600012345');
        Config::set('services.feexpay.shop_id', 'shop-test-01');
        Config::set('services.feexpay.api_key', 'feexpay-secret-key');

        Http::fake([
            '*emcf/api/invoice*' => Http::response([
                'uid' => 'NIM-BJ-9901',
                'codeMECeFDGI' => 'MECEF-DGI-2026-ABCD1234',
                'qrCode' => 'F;NIM-BJ-9901;MECEF-DGI-2026-ABCD1234;2026-11-12',
                'counters' => '12/12 FV',
            ], 200),
            '*requesttopay*' => Http::response([
                'reference' => 'FP-PROV-887766',
                'status' => 'PENDING',
            ], 200),
        ]);

        // Cross-tenant sale_id -> 404
        $foreignSale = Sale::create([
            'officine_id' => $this->otherOffice->id,
            'reference' => 'VTE-OTHER-1',
            'sale_type' => 'libre',
            'status' => 'payee',
            'total_amount' => 10000,
            'paid_amount' => 10000,
            'cashier_user_id' => $this->admin->id,
            'version' => 1,
        ]);
        $this->postJson('/api/v1/fiscalite/invoices', [
            'sale_id' => $foreignSale->id,
            'reference' => 'FAC-XT-01',
            'total_ht' => 10000,
            'total_tva' => 0,
            'total_ttc' => 10000,
        ])->assertNotFound();

        // Facture + certification e-MECEF
        $inv = $this->postJson('/api/v1/fiscalite/invoices', [
            'reference' => 'FAC-DGI-01',
            'customer_name' => 'Patient Officine',
            'total_ht' => 15000,
            'total_tva' => 0,
            'total_ttc' => 15000,
        ])->assertCreated();
        $invId = $inv->json('data.id');

        $cert = $this->postJson("/api/v1/fiscalite/invoices/{$invId}/certify")->assertOk();
        $this->assertEquals('certifiee', $cert->json('data.status'));
        $this->assertEquals('MECEF-DGI-2026-ABCD1234', $cert->json('data.mecef_code'));

        // Paiement FeexPay + Webhook HMAC
        $intent = $this->postJson('/api/v1/fiscalite/feexpay/intents', [
            'reference' => 'FP-TX-01',
            'amount' => 15000,
            'network' => 'MTN',
            'phone_number' => '22997000002',
        ])->assertCreated();
        $this->assertEquals('en_attente', $intent->json('data.status'));
        $this->assertEquals('FP-PROV-887766', $intent->json('data.provider_reference'));

        $whPayload = [
            'officine_id' => $this->office->id,
            'reference' => 'FP-TX-01',
            'provider_reference' => 'FP-PROV-887766',
            'status' => 'SUCCESSFUL',
        ];
        // Signature invalide -> 403
        $this->postJson('/api/v1/fiscalite/feexpay/webhook', $whPayload)->assertForbidden();

        // Signature valide -> 200 puis idempotent
        $sig = hash_hmac('sha256', json_encode($whPayload, JSON_THROW_ON_ERROR), 'feexpay-secret-key');
        $this->withHeaders(['X-FeexPay-Signature' => $sig])
            ->postJson('/api/v1/fiscalite/feexpay/webhook', $whPayload)
            ->assertOk()
            ->assertJsonPath('data.status', 'confirme')
            ->assertJsonPath('replayed', false);

        $this->withHeaders(['X-FeexPay-Signature' => $sig])
            ->postJson('/api/v1/fiscalite/feexpay/webhook', $whPayload)
            ->assertOk()
            ->assertJsonPath('replayed', true);
    }
}

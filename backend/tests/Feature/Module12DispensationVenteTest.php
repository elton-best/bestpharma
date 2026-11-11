<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Dispensation\Models\DispensingEvent;
use App\Modules\Qualite\Models\QualityAction;
use App\Modules\Stock\Models\Lot;
use App\Modules\Stock\Models\Product;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Module12DispensationVenteTest extends TestCase
{
    use RefreshDatabase;

    private User $pharmacist;
    private Officine $office;
    private Product $product;
    private Lot $lot;

    protected function setUp(): void
    {
        parent::setUp();
        $this->pharmacist = User::create([
            'name' => 'Pharmacien Dispensation M12',
            'email' => 'pharma-m12@example.test',
            'password' => 'Fictional12345',
        ]);
        $this->office = Officine::create([
            'name' => 'Pharmacie Recette M12',
            'slug' => 'pharmacie-recette-m12',
            'status' => 'active',
        ]);

        DB::table('officine_user')->insert([
            'user_id' => $this->pharmacist->id,
            'officine_id' => $this->office->id,
            'is_admin' => true,
            'is_active' => true,
            'permissions' => '[]',
        ]);
        DB::table('officine_modules')->insert([
            ['officine_id' => $this->office->id, 'module' => 'qualite', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'stock', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'dispensation', 'is_active' => true],
        ]);

        $this->product = Product::create([
            'officine_id' => $this->office->id,
            'code' => 'AUGM-1G',
            'name' => 'Augmentin 1g Sachet',
            'selling_price' => 3500,
            'version' => 1,
        ]);

        $this->lot = Lot::create([
            'officine_id' => $this->office->id,
            'product_id' => $this->product->id,
            'batch_number' => 'LOT-AUG-01',
            'expiry_date' => now()->addMonths(10)->toDateString(),
            'initial_qty' => 10,
            'available_qty' => 10,
            'unit_cost' => 2500,
            'status' => 'disponible',
            'is_sellable' => true,
            'version' => 1,
        ]);

        Sanctum::actingAs($this->pharmacist);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    public function test_overview_indicators_with_non_disponible_default(): void
    {
        $res = $this->getJson('/api/v1/dispensation/overview');
        $res->assertOk();
        $res->assertJsonStructure([
            'meta' => ['officine_id', 'as_of', 'period'],
            'kpis' => [
                'total_sales',
                'paid_sales',
                'pending_sales',
                'cancelled_sales',
                'total_returns',
                'pending_returns',
                'safety_reports_count',
                'review_approval_rate',
            ],
        ]);
        $this->assertEquals('non disponible', $res->json('kpis.review_approval_rate'));
    }

    public function test_prescription_sale_requires_review_and_confirm_is_atomic_and_idempotent(): void
    {
        $saleRes = $this->postJson('/api/v1/dispensation/sales', [
            'reference' => 'VTE-2026-001',
            'idempotency_key' => 'idem-sale-001',
            'sale_type' => 'ordonnance',
            'prescription' => [
                'prescription_ref' => 'ORD-8821',
                'prescription_date' => now()->toDateString(),
                'prescriber_name' => 'Dr. A. Mensah',
            ],
            'lines' => [
                ['product_id' => $this->product->id, 'quantity' => 3, 'dispensing_advice' => 'Prendre pendant les repas'],
            ],
        ]);
        $saleRes->assertCreated();
        $saleId = $saleRes->json('data.id');
        $this->assertEquals(10500.0, (float) $saleRes->json('data.total_amount'));
        $this->assertEquals('en_analyse', $saleRes->json('data.status'));

        // Tentative de confirmation sans analyse pharmaceutique -> 422
        $this->postJson("/api/v1/dispensation/sales/{$saleId}/confirm", [
            'payment_status' => 'confirme',
            'payment_method' => 'especes',
        ])->assertStatus(422);

        // Analyse pharmaceutique (CDC 3.2)
        $this->postJson("/api/v1/dispensation/sales/{$saleId}/review", [
            'decision' => 'approuve',
            'posology_checked' => true,
            'interactions_checked' => true,
            'contraindications_checked' => true,
            'clinical_notes' => 'Posologie 1g x 2/j validée.',
        ])->assertCreated()->assertJsonPath('sale_status', 'validee');

        // Encaissement & décrément atomique FEFO (CDC 3.4)
        $confirmRes = $this->postJson("/api/v1/dispensation/sales/{$saleId}/confirm", [
            'payment_status' => 'confirme',
            'payment_method' => 'especes',
        ]);
        $confirmRes->assertOk();
        $this->assertTrue($confirmRes->json('stock_decremented'));

        $this->lot->refresh();
        $this->assertEquals(7, $this->lot->available_qty);
        $this->assertEquals(1, DispensingEvent::where('sale_id', $saleId)->count());

        // Rejeu / double-clic confirm -> idempotent sans double décrément
        $replayConfirm = $this->postJson("/api/v1/dispensation/sales/{$saleId}/confirm", [
            'payment_status' => 'confirme',
            'payment_method' => 'especes',
        ]);
        $replayConfirm->assertOk()->assertJsonPath('replayed', true);
        $this->lot->refresh();
        $this->assertEquals(7, $this->lot->available_qty);
    }

    public function test_cancelled_payment_and_expired_or_quarantined_lot_are_blocked(): void
    {
        // 1. Lot en quarantaine invendable (CDC 7)
        $quarLot = Lot::create([
            'officine_id' => $this->office->id,
            'product_id' => $this->product->id,
            'batch_number' => 'LOT-QUAR-9',
            'expiry_date' => now()->addMonths(6)->toDateString(),
            'available_qty' => 5,
            'status' => 'quarantaine',
            'is_sellable' => false,
            'version' => 1,
        ]);

        $this->postJson('/api/v1/dispensation/sales', [
            'reference' => 'VTE-BAD-1',
            'sale_type' => 'comptoir_libre',
            'lines' => [
                ['product_id' => $this->product->id, 'lot_id' => $quarLot->id, 'quantity' => 1],
            ],
        ])->assertStatus(422);

        // 2. Paiement annulé ne décrémente pas le stock et ne crée pas de vente fantôme
        $saleRes = $this->postJson('/api/v1/dispensation/sales', [
            'reference' => 'VTE-CANCEL-1',
            'sale_type' => 'comptoir_libre',
            'lines' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
        ]);
        $saleId = $saleRes->json('data.id');

        $cancelRes = $this->postJson("/api/v1/dispensation/sales/{$saleId}/confirm", [
            'payment_status' => 'annule',
        ]);
        $cancelRes->assertOk()->assertJsonPath('stock_decremented', false);
        $this->lot->refresh();
        $this->assertEquals(10, $this->lot->available_qty);
        $this->assertEquals(0, DispensingEvent::where('sale_id', $saleId)->count());
    }

    public function test_return_never_auto_restores_stock_and_credit_capped_at_paid_amount(): void
    {
        // Vente de 2 boîtes (7000 FCFA)
        $saleRes = $this->postJson('/api/v1/dispensation/sales', [
            'reference' => 'VTE-RET-1',
            'sale_type' => 'comptoir_libre',
            'lines' => [['product_id' => $this->product->id, 'quantity' => 2]],
        ]);
        $saleId = $saleRes->json('data.id');
        $this->postJson("/api/v1/dispensation/sales/{$saleId}/confirm", [
            'payment_status' => 'confirme',
            'payment_method' => 'especes',
        ])->assertOk();

        $this->lot->refresh();
        $this->assertEquals(8, $this->lot->available_qty);

        // 1. Demande de retour -> stock vendable inchangé (CDC 7)
        $retRes = $this->postJson('/api/v1/dispensation/returns', [
            'reference' => 'RET-2026-001',
            'sale_id' => $saleId,
            'product_id' => $this->product->id,
            'lot_id' => $this->lot->id,
            'quantity_returned' => 1,
            'reason' => 'Erreur de dosage prescrit',
        ]);
        $retRes->assertCreated();
        $retId = $retRes->json('data.id');
        $this->assertEquals('en_attente', $retRes->json('data.pharmacist_decision'));
        $this->lot->refresh();
        $this->assertEquals(8, $this->lot->available_qty);

        // 2. Avoir supérieur au montant payé (7000) -> refusé
        $this->postJson("/api/v1/dispensation/returns/{$retId}/evaluate", [
            'pharmacist_decision' => 'quarantaine',
            'issue_credit_amount' => 9000,
        ])->assertStatus(422);

        // 3. Évaluation quarantaine + avoir valide (3500) -> crée CAPA M4 + QuarantineEvent + Credit
        $evalRes = $this->postJson("/api/v1/dispensation/returns/{$retId}/evaluate", [
            'pharmacist_decision' => 'quarantaine',
            'issue_credit_amount' => 3500,
        ]);
        $evalRes->assertOk();
        $this->assertNotNull($evalRes->json('data.created_action_id'));
        $this->lot->refresh();
        $this->assertEquals(8, $this->lot->available_qty, 'Un retour mis en quarantaine ne réintègre pas le stock vendable.');
        $this->assertDatabaseHas('credits', ['return_id' => $retId, 'amount' => 3500]);
    }

    public function test_safety_report_creates_capa_and_never_claims_unverified_abmed_transmission(): void
    {
        $repRes = $this->postJson('/api/v1/dispensation/safety-reports', [
            'reference' => 'SIG-2026-001',
            'product_id' => $this->product->id,
            'lot_id' => $this->lot->id,
            'report_type' => 'defaut_qualite',
            'severity' => 'grave',
            'description' => 'Sachets percés dans la boîte scellée.',
        ]);
        $repRes->assertCreated();
        $this->assertEquals('local_uniquement', $repRes->json('data.external_transmission_status'));
        $this->assertNotNull($repRes->json('data.created_action_id'));

        $capa = QualityAction::withoutGlobalScopes()->find($repRes->json('data.created_action_id'));
        $this->assertNotNull($capa);
        $this->assertEquals('critical', $capa->severity);
    }
}

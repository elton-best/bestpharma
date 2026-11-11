<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Dispensation\Models\Sale;
use App\Modules\Qualite\Models\QualityAction;
use App\Modules\Tenancy\Models\Officine;
use App\Modules\Tresorerie\Models\CashRegister;
use App\Modules\Tresorerie\Models\CashSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Module13CaisseFinancesTest extends TestCase
{
    use RefreshDatabase;

    private User $cashier;
    private User $incomingCashier;
    private Officine $office;
    private CashRegister $register;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cashier = User::create([
            'name' => 'Caissier Principal M13',
            'email' => 'cashier-m13@example.test',
            'password' => 'Fictional12345',
        ]);
        $this->incomingCashier = User::create([
            'name' => 'Caissier Relève M13',
            'email' => 'releve-m13@example.test',
            'password' => 'Fictional12345',
        ]);
        $this->office = Officine::create([
            'name' => 'Pharmacie Recette M13',
            'slug' => 'pharmacie-recette-m13',
            'status' => 'active',
        ]);

        DB::table('officine_user')->insert([
            ['user_id' => $this->cashier->id, 'officine_id' => $this->office->id, 'is_admin' => true, 'is_active' => true, 'permissions' => '[]'],
            ['user_id' => $this->incomingCashier->id, 'officine_id' => $this->office->id, 'is_admin' => true, 'is_active' => true, 'permissions' => '[]'],
        ]);
        DB::table('officine_modules')->insert([
            ['officine_id' => $this->office->id, 'module' => 'qualite', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'dispensation', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'tresorerie', 'is_active' => true],
        ]);

        $this->register = CashRegister::create([
            'officine_id' => $this->office->id,
            'code' => 'CAISSE-01',
            'name' => 'Caisse Comptoir Principale',
            'discrepancy_alert_threshold' => 1000.00,
            'is_active' => true,
            'version' => 1,
        ]);

        Sanctum::actingAs($this->cashier);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    public function test_overview_indicators_with_non_disponible_default(): void
    {
        $res = $this->getJson('/api/v1/tresorerie/overview');
        $res->assertOk();
        $res->assertJsonStructure([
            'meta' => ['officine_id', 'as_of', 'period'],
            'kpis' => [
                'open_sessions',
                'today_receipts_total',
                'pending_expenses',
                'open_handovers',
                'reconciliations_with_variance',
                'session_conformity_rate',
            ],
        ]);
        $this->assertEquals('non disponible', $res->json('kpis.session_conformity_rate'));
    }

    public function test_idempotent_payment_transaction_and_refund_cap(): void
    {
        $sessionRes = $this->postJson('/api/v1/tresorerie/sessions/open', [
            'cash_register_id' => $this->register->id,
            'session_ref' => 'SES-2026-001',
            'opening_float' => 20000,
        ]);
        $sessionRes->assertCreated();
        $sessionId = $sessionRes->json('data.id');

        $sale = Sale::create([
            'officine_id' => $this->office->id,
            'reference' => 'VTE-C13-01',
            'sale_type' => 'comptoir_libre',
            'status' => 'validee',
            'total_amount' => 15000,
            'payment_status' => 'en_attente',
            'version' => 1,
        ]);

        // 1. Encaissement idempotent (CDC 7 : double-clic traité 1 fois)
        $payPayload = [
            'cash_session_id' => $sessionId,
            'sale_id' => $sale->id,
            'transaction_ref' => 'TX-2026-001',
            'idempotency_key' => 'idem-pay-c13-001',
            'transaction_type' => 'encaissement',
            'payment_method' => 'especes',
            'amount' => 15000,
        ];
        $tx1 = $this->postJson('/api/v1/tresorerie/transactions', $payPayload);
        $tx1->assertCreated()->assertJsonPath('replayed', false);

        $txReplay = $this->postJson('/api/v1/tresorerie/transactions', $payPayload);
        $txReplay->assertOk()->assertJsonPath('replayed', true);

        $session = CashSession::find($sessionId);
        $this->assertEquals(35000.0, (float) $session->expected_closing_balance);

        // 2. Remboursement supérieur au montant payé -> 422
        $this->postJson('/api/v1/tresorerie/transactions', [
            'cash_session_id' => $sessionId,
            'sale_id' => $sale->id,
            'transaction_ref' => 'TX-REFUND-BAD',
            'transaction_type' => 'remboursement',
            'payment_method' => 'especes',
            'amount' => 18000,
        ])->assertStatus(422);

        // 3. Remboursement valide <= 15000 -> accepté
        $this->postJson('/api/v1/tresorerie/transactions', [
            'cash_session_id' => $sessionId,
            'sale_id' => $sale->id,
            'transaction_ref' => 'TX-REFUND-OK',
            'transaction_type' => 'remboursement',
            'payment_method' => 'especes',
            'amount' => 5000,
        ])->assertCreated();

        $session->refresh();
        $this->assertEquals(30000.0, (float) $session->expected_closing_balance);
    }

    public function test_traceable_reversal_without_silent_mutation(): void
    {
        $session = CashSession::create([
            'officine_id' => $this->office->id,
            'cash_register_id' => $this->register->id,
            'session_ref' => 'SES-REV-01',
            'cashier_user_id' => $this->cashier->id,
            'opened_at' => now(),
            'opening_float' => 10000,
            'expected_closing_balance' => 10000,
            'status' => 'ouverte',
            'version' => 1,
        ]);

        $txRes = $this->postJson('/api/v1/tresorerie/transactions', [
            'cash_session_id' => $session->id,
            'transaction_ref' => 'TX-ERR-01',
            'transaction_type' => 'encaissement',
            'payment_method' => 'especes',
            'amount' => 8000,
        ]);
        $txId = $txRes->json('data.id');
        $session->refresh();
        $this->assertEquals(18000.0, (float) $session->expected_closing_balance);

        // Contrepassation traçable (CDC 3.6)
        $revRes = $this->postJson("/api/v1/tresorerie/transactions/{$txId}/reverse", [
            'reversal_reason' => 'Erreur de saisie mode de règlement (Mobile Money au lieu d’espèces).',
        ]);
        $revRes->assertCreated();
        $this->assertEquals('contrepassation', $revRes->json('data.transaction_type'));
        $this->assertDatabaseHas('payment_transactions', ['id' => $txId, 'status' => 'contrepasse']);

        $session->refresh();
        $this->assertEquals(10000.0, (float) $session->expected_closing_balance);
    }

    public function test_expense_and_handover_preserves_variance_and_creates_capa(): void
    {
        $session = CashSession::create([
            'officine_id' => $this->office->id,
            'cash_register_id' => $this->register->id,
            'session_ref' => 'SES-HAND-01',
            'cashier_user_id' => $this->cashier->id,
            'opened_at' => now(),
            'opening_float' => 25000,
            'expected_closing_balance' => 25000,
            'status' => 'ouverte',
            'version' => 1,
        ]);

        // 1. Dépense caisse approuvée & décaissée (2500 -> solde théorique = 22500)
        $expRes = $this->postJson('/api/v1/tresorerie/expenses', [
            'cash_session_id' => $session->id,
            'reference' => 'DEP-2026-01',
            'category' => 'transport',
            'amount' => 2500,
            'reason' => 'Course urgente livraison réfrigérée',
        ]);
        $expId = $expRes->json('data.id');
        $this->postJson("/api/v1/tresorerie/expenses/{$expId}/decision", ['decision' => 'decaissee'])->assertOk();

        $session->refresh();
        $this->assertEquals(22500.0, (float) $session->expected_closing_balance);

        // 2. Passation avec billetage compté = 20500 (écart -2000 > seuil 1000 FCFA)
        $handRes = $this->postJson('/api/v1/tresorerie/handovers', [
            'cash_session_id' => $session->id,
            'incoming_user_id' => $this->incomingCashier->id,
            'counted_cash' => 20500,
            'denominations' => [['label' => '10000', 'unit_value' => 10000, 'quantity' => 2, 'subtotal' => 20000], ['label' => '500', 'unit_value' => 500, 'quantity' => 1, 'subtotal' => 500]],
            'anomalies_notes' => 'Manque un billet de 2000 FCFA non justifié.',
        ]);
        $handRes->assertCreated();
        $handoverId = $handRes->json('data.id');
        $this->assertEquals(-2000.0, (float) $handRes->json('data.variance_amount'));
        $this->assertNotNull($handRes->json('data.created_action_id'));

        $capa = QualityAction::withoutGlobalScopes()->find($handRes->json('data.created_action_id'));
        $this->assertNotNull($capa);

        // Signature caissier entrant -> CDC 7 : l'écart reste conservé !
        Sanctum::actingAs($this->incomingCashier);
        $signRes = $this->postJson("/api/v1/tresorerie/handovers/{$handoverId}/sign-incoming");
        $signRes->assertOk();
        $this->assertEquals('signee', $signRes->json('data.status'));
        $this->assertEquals(-2000.0, (float) $signRes->json('data.variance_amount'));
    }

    public function test_daily_reconciliation_detects_variance_and_creates_capa(): void
    {
        $session = CashSession::create([
            'officine_id' => $this->office->id,
            'cash_register_id' => $this->register->id,
            'session_ref' => 'SES-REC-01',
            'cashier_user_id' => $this->cashier->id,
            'opened_at' => now(),
            'opening_float' => 0,
            'expected_closing_balance' => 0,
            'status' => 'ouverte',
            'version' => 1,
        ]);

        $this->postJson('/api/v1/tresorerie/transactions', [
            'cash_session_id' => $session->id,
            'transaction_ref' => 'TX-RAP-1',
            'transaction_type' => 'encaissement',
            'payment_method' => 'especes',
            'amount' => 50000,
        ])->assertCreated();

        // Déclaré = 47500 -> écart -2500 > 1000 -> ecart_a_justifier + CAPA M4
        $recRes = $this->postJson('/api/v1/tresorerie/reconciliations', [
            'reference' => 'RAP-2026-01',
            'period_date' => now()->toDateString(),
            'lines' => [
                ['payment_method' => 'especes', 'declared_amount' => 47500, 'justification' => 'Erreur rendu monnaie suspectée'],
            ],
        ]);
        $recRes->assertCreated();
        $this->assertEquals(-2500.0, (float) $recRes->json('data.total_variance'));
        $this->assertEquals('ecart_a_justifier', $recRes->json('data.status'));
        $this->assertNotNull($recRes->json('data.created_action_id'));
    }
}

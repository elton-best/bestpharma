<?php

declare(strict_types=1);

namespace App\Modules\Tresorerie\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Dispensation\Models\Sale;
use App\Modules\Qualite\Models\QualityAction;
use App\Modules\Tresorerie\Models\CashCount;
use App\Modules\Tresorerie\Models\CashMovement;
use App\Modules\Tresorerie\Models\CashRegister;
use App\Modules\Tresorerie\Models\CashSession;
use App\Modules\Tresorerie\Models\ExpenseRequest;
use App\Modules\Tresorerie\Models\Handover;
use App\Modules\Tresorerie\Models\PaymentTransaction;
use App\Modules\Tresorerie\Models\ReconciliationLine;
use App\Modules\Tresorerie\Models\ReconciliationRun;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class Module13CaisseFinancesController extends Controller
{
    protected function getOfficineId(Request $request): int
    {
        $tenantId = app()->bound('tenant.officine_id') ? app('tenant.officine_id') : null;
        $headerId = $request->header('X-Officine-ID');
        return (int) ($tenantId ?? $headerId ?? 1);
    }

    protected function checkPermission(Request $request, string $permission): void
    {
        $isAdmin = (bool) $request->attributes->get('officine.is_admin', false);
        if ($isAdmin) {
            return;
        }

        $perms = $request->attributes->get('officine.permissions', []);

        $altPerm = str_starts_with($permission, 'tresorerie.')
            ? str_replace('tresorerie.', 'qualite.', $permission)
            : str_replace('qualite.', 'tresorerie.', $permission);

        abort_unless(
            in_array($permission, $perms, true)
            || in_array($altPerm, $perms, true)
            || in_array('caisse.sell', $perms, true)
            || in_array('caisse.session.manage', $perms, true)
            || in_array('admin', $perms, true),
            403,
            "Permission {$permission} requise."
        );
    }

    /**
     * Indicateurs consolidés Caisse & Finances (CDC 6)
     */
    public function overview(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.read');
        $officineId = $this->getOfficineId($request);
        $today = Carbon::today()->toDateString();

        $openSessions = CashSession::where('officine_id', $officineId)->whereIn('status', ['ouverte', 'passation_en_cours'])->count();
        $closedSessions = CashSession::where('officine_id', $officineId)->where('status', 'cloturee')->get();
        $closedWithoutDiscrepancy = $closedSessions->filter(fn ($s) => abs((float) $s->discrepancy_amount) <= 0.01)->count();

        $todayReceipts = PaymentTransaction::where('officine_id', $officineId)
            ->where('transaction_type', 'encaissement')
            ->where('status', 'confirme')
            ->whereDate('occurred_at', $today)
            ->sum('amount');

        $pendingExpenses = ExpenseRequest::where('officine_id', $officineId)->whereIn('status', ['brouillon', 'soumise'])->count();
        $openHandovers = Handover::where('officine_id', $officineId)->where('status', 'en_attente_entrant')->count();
        $reconciliationsVariance = ReconciliationRun::where('officine_id', $officineId)->where('status', 'ecart_a_justifier')->count();

        $conformityRate = $closedSessions->count() > 0
            ? round(($closedWithoutDiscrepancy / $closedSessions->count()) * 100, 1)
            : 'non disponible';

        return response()->json([
            'meta' => [
                'officine_id' => $officineId,
                'as_of' => now()->toIso8601String(),
                'period' => 'journee_courante',
            ],
            'kpis' => [
                'open_sessions' => $openSessions,
                'today_receipts_total' => round((float) $todayReceipts, 2),
                'pending_expenses' => $pendingExpenses,
                'open_handovers' => $openHandovers,
                'reconciliations_with_variance' => $reconciliationsVariance,
                'session_conformity_rate' => $conformityRate,
            ],
        ]);
    }

    // ==========================================
    // 1. CAISSES & SESSIONS (CDC 3.1)
    // ==========================================

    public function registersIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => CashRegister::where('officine_id', $officineId)->orderBy('code')->get(),
        ]);
    }

    public function storeRegister(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:120',
            'location_label' => 'nullable|string|max:120',
            'discrepancy_alert_threshold' => 'sometimes|numeric|min:0',
        ]);

        if (CashRegister::where('officine_id', $officineId)->where('code', $validated['code'])->exists()) {
            return response()->json(['message' => 'Ce code de caisse existe déjà.'], 422);
        }

        $register = CashRegister::create([
            'officine_id' => $officineId,
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'location_label' => $validated['location_label'] ?? 'Comptoir Principal',
            'discrepancy_alert_threshold' => $validated['discrepancy_alert_threshold'] ?? 1000.00,
            'is_active' => true,
            'version' => 1,
        ]);

        return response()->json(['data' => $register], 201);
    }

    public function sessionsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.read');
        $officineId = $this->getOfficineId($request);

        $sessions = CashSession::with(['register:id,code,name,discrepancy_alert_threshold', 'cashier:id,name'])
            ->where('officine_id', $officineId)
            ->orderByDesc('opened_at')
            ->get();

        return response()->json(['data' => $sessions]);
    }

    public function openSession(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'cash_register_id' => 'required|integer',
            'session_ref' => 'required|string|max:50',
            'opening_float' => 'required|numeric|min:0',
            'denominations' => 'nullable|array',
        ]);

        $register = CashRegister::where('officine_id', $officineId)->find($validated['cash_register_id']);
        if (!$register) {
            return response()->json(['message' => 'Caisse introuvable.'], 404);
        }

        if (CashSession::where('officine_id', $officineId)->where('cash_register_id', $register->id)->whereIn('status', ['ouverte', 'passation_en_cours'])->exists()) {
            return response()->json(['message' => 'Une session est déjà ouverte sur cette caisse.'], 422);
        }

        return DB::transaction(function () use ($validated, $officineId, $register, $request) {
            $session = CashSession::create([
                'officine_id' => $officineId,
                'cash_register_id' => $register->id,
                'session_ref' => $validated['session_ref'],
                'cashier_user_id' => $request->user()?->id ?? 1,
                'opened_at' => now(),
                'opening_float' => $validated['opening_float'],
                'expected_closing_balance' => $validated['opening_float'],
                'status' => 'ouverte',
                'version' => 1,
            ]);

            if (!empty($validated['denominations'])) {
                CashCount::create([
                    'officine_id' => $officineId,
                    'cash_session_id' => $session->id,
                    'count_type' => 'ouverture',
                    'denominations' => $validated['denominations'],
                    'total_counted' => $validated['opening_float'],
                    'counted_by_user_id' => $request->user()?->id ?? 1,
                    'counted_at' => now(),
                ]);
            }

            return response()->json(['data' => $session->load('register:id,code,name')], 201);
        });
    }

    public function closeSession(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'actual_closing_balance' => 'required|numeric|min:0',
            'discrepancy_justification' => 'nullable|string',
            'denominations' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($officineId, $id, $validated, $request) {
            $session = CashSession::with('register')->where('officine_id', $officineId)->lockForUpdate()->find($id);
            if (!$session) {
                return response()->json(['message' => 'Session introuvable.'], 404);
            }
            if ($session->status === 'cloturee') {
                return response()->json(['message' => 'Session déjà clôturée.'], 422);
            }

            $discrepancy = round(((float) $validated['actual_closing_balance']) - (float) $session->expected_closing_balance, 2);
            $threshold = (float) ($session->register?->discrepancy_alert_threshold ?? 1000.0);

            if (abs($discrepancy) > $threshold && empty($validated['discrepancy_justification'])) {
                return response()->json(['message' => "Écart de {$discrepancy} FCFA (> seuil {$threshold} FCFA) : justification requise."], 422);
            }

            if (abs($discrepancy) > $threshold) {
                QualityAction::create([
                    'officine_id' => $officineId,
                    'created_by' => $request->user()?->id ?? 1,
                    'title' => "Écart de clôture caisse {$session->session_ref} ({$discrepancy} FCFA)",
                    'chapter' => 'Caisse & Finances',
                    'severity' => 'high',
                    'owner' => $request->user()?->name ?? 'Pharmacien Titulaire',
                    'due_date' => now()->addDays(2)->toDateString(),
                    'status' => 'open',
                    'description' => "Attendu : {$session->expected_closing_balance} | Constaté : {$validated['actual_closing_balance']}. Motif : " . ($validated['discrepancy_justification'] ?? 'Non précisé'),
                    'resolution' => '',
                ]);
            }

            if (!empty($validated['denominations'])) {
                CashCount::create([
                    'officine_id' => $officineId,
                    'cash_session_id' => $session->id,
                    'count_type' => 'cloture',
                    'denominations' => $validated['denominations'],
                    'total_counted' => $validated['actual_closing_balance'],
                    'counted_by_user_id' => $request->user()?->id ?? 1,
                    'counted_at' => now(),
                ]);
            }

            $session->update([
                'closed_at' => now(),
                'actual_closing_balance' => $validated['actual_closing_balance'],
                'discrepancy_amount' => $discrepancy,
                'discrepancy_justification' => $validated['discrepancy_justification'] ?? null,
                'status' => 'cloturee',
                'version' => $session->version + 1,
            ]);

            return response()->json(['data' => $session]);
        });
    }

    // ==========================================
    // 2. ENCAISSEMENTS & CONTREPASSATIONS (CDC 3.2, 3.6 & 7)
    // ==========================================

    public function transactionsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.read');
        $officineId = $this->getOfficineId($request);

        $txs = PaymentTransaction::with(['session:id,session_ref', 'recordedBy:id,name'])
            ->where('officine_id', $officineId)
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->get();

        return response()->json(['data' => $txs]);
    }

    public function storeTransaction(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'cash_session_id' => 'required|integer',
            'sale_id' => 'nullable|integer',
            'transaction_ref' => 'required|string|max:50',
            'idempotency_key' => 'nullable|string|max:100',
            'transaction_type' => 'required|string|in:encaissement,remboursement',
            'payment_method' => 'required|string|in:especes,mobile_money,carte,credit',
            'external_provider_ref' => 'nullable|string|max:120',
            'amount' => 'required|numeric|min:1',
        ]);

        // CDC 7 : Double-clic paiement traité une seule fois
        if (!empty($validated['idempotency_key'])) {
            $existing = PaymentTransaction::where('officine_id', $officineId)
                ->where('idempotency_key', $validated['idempotency_key'])
                ->first();
            if ($existing) {
                return response()->json(['data' => $existing, 'replayed' => true], 200);
            }
        }

        if (PaymentTransaction::where('officine_id', $officineId)->where('transaction_ref', $validated['transaction_ref'])->exists()) {
            return response()->json(['message' => 'Cette référence de transaction existe déjà.'], 422);
        }

        if (!empty($validated['sale_id']) && !Sale::where('officine_id', $officineId)->where('id', $validated['sale_id'])->exists()) {
            return response()->json(['message' => 'Vente introuvable dans cette officine.'], 404);
        }

        return DB::transaction(function () use ($validated, $officineId, $request) {
            $session = CashSession::where('officine_id', $officineId)->lockForUpdate()->find($validated['cash_session_id']);
            if (!$session || $session->status === 'cloturee') {
                return response()->json(['message' => 'Session de caisse introuvable ou clôturée.'], 422);
            }

            // CDC 7 : Remboursement ne dépasse pas le montant payé
            if ($validated['transaction_type'] === 'remboursement') {
                if (empty($validated['sale_id'])) {
                    return response()->json(['message' => 'Un remboursement doit être rattaché à une vente ou transaction d’origine.'], 422);
                }
                $paid = (float) PaymentTransaction::where('officine_id', $officineId)
                    ->where('sale_id', $validated['sale_id'])
                    ->where('transaction_type', 'encaissement')
                    ->where('status', 'confirme')
                    ->sum('amount');
                $alreadyRefunded = (float) PaymentTransaction::where('officine_id', $officineId)
                    ->where('sale_id', $validated['sale_id'])
                    ->where('transaction_type', 'remboursement')
                    ->where('status', 'confirme')
                    ->sum('amount');
                if ($alreadyRefunded + (float) $validated['amount'] > $paid) {
                    return response()->json(['message' => 'Le remboursement dépasse le montant total payé sur la vente d’origine.'], 422);
                }
            }

            $tx = PaymentTransaction::create([
                'officine_id' => $officineId,
                'cash_session_id' => $session->id,
                'sale_id' => $validated['sale_id'] ?? null,
                'transaction_ref' => $validated['transaction_ref'],
                'idempotency_key' => $validated['idempotency_key'] ?? null,
                'transaction_type' => $validated['transaction_type'],
                'payment_method' => $validated['payment_method'],
                'external_provider_ref' => $validated['external_provider_ref'] ?? null,
                'amount' => $validated['amount'],
                'status' => 'confirme',
                'recorded_by_user_id' => $request->user()?->id ?? 1,
                'occurred_at' => now(),
                'version' => 1,
            ]);

            if ($validated['payment_method'] === 'especes') {
                $delta = $validated['transaction_type'] === 'encaissement' ? (float) $validated['amount'] : -(float) $validated['amount'];
                $session->update([
                    'expected_closing_balance' => round($session->expected_closing_balance + $delta, 2),
                    'version' => $session->version + 1,
                ]);
            }

            return response()->json(['data' => $tx, 'replayed' => false], 201);
        });
    }

    /**
     * Contrepassation traçable sans modification silencieuse (CDC 3.6)
     */
    public function reverseTransaction(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'reversal_reason' => 'required|string|min:5',
        ]);

        return DB::transaction(function () use ($officineId, $id, $validated, $request) {
            $orig = PaymentTransaction::where('officine_id', $officineId)->lockForUpdate()->find($id);
            if (!$orig) {
                return response()->json(['message' => 'Transaction introuvable.'], 404);
            }
            if ($orig->status !== 'confirme') {
                return response()->json(['message' => 'Seule une transaction confirmée peut être contrepassée.'], 422);
            }

            $session = CashSession::where('officine_id', $officineId)->lockForUpdate()->find($orig->cash_session_id);
            if (!$session || $session->status === 'cloturee') {
                return response()->json(['message' => 'Session clôturée : contrepassation impossible sur cette session.'], 422);
            }

            $orig->update([
                'status' => 'contrepasse',
                'reversal_reason' => $validated['reversal_reason'],
                'version' => $orig->version + 1,
            ]);

            $reversal = PaymentTransaction::create([
                'officine_id' => $officineId,
                'cash_session_id' => $orig->cash_session_id,
                'sale_id' => $orig->sale_id,
                'transaction_ref' => "REV-{$orig->transaction_ref}",
                'transaction_type' => 'contrepassation',
                'payment_method' => $orig->payment_method,
                'amount' => $orig->amount,
                'status' => 'confirme',
                'original_transaction_id' => $orig->id,
                'reversal_reason' => $validated['reversal_reason'],
                'recorded_by_user_id' => $request->user()?->id ?? 1,
                'occurred_at' => now(),
                'version' => 1,
            ]);

            if ($orig->payment_method === 'especes') {
                $delta = $orig->transaction_type === 'encaissement' ? -(float) $orig->amount : (float) $orig->amount;
                $session->update([
                    'expected_closing_balance' => round($session->expected_closing_balance + $delta, 2),
                    'version' => $session->version + 1,
                ]);
            }

            return response()->json(['data' => $reversal, 'original' => $orig], 201);
        });
    }

    // ==========================================
    // 3. DÉPENSES & APPROBATIONS (CDC 3.3)
    // ==========================================

    public function expensesIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => ExpenseRequest::with(['requestedBy:id,name', 'approvedBy:id,name'])
                ->where('officine_id', $officineId)
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function storeExpense(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'cash_session_id' => 'nullable|integer',
            'reference' => 'required|string|max:50',
            'category' => 'required|string|in:fournitures,transport,entretien,urgence_bpd,autre',
            'amount' => 'required|numeric|min:1',
            'reason' => 'required|string',
            'proof_reference' => 'nullable|string|max:120',
        ]);

        if (ExpenseRequest::where('officine_id', $officineId)->where('reference', $validated['reference'])->exists()) {
            return response()->json(['message' => 'Cette référence de dépense existe déjà.'], 422);
        }

        if (!empty($validated['cash_session_id']) && !CashSession::where('officine_id', $officineId)->where('id', $validated['cash_session_id'])->exists()) {
            return response()->json(['message' => 'Session de caisse introuvable dans cette officine.'], 404);
        }

        $expense = ExpenseRequest::create([
            ...$validated,
            'officine_id' => $officineId,
            'status' => 'soumise',
            'requested_by_user_id' => $request->user()?->id ?? 1,
            'version' => 1,
        ]);

        return response()->json(['data' => $expense], 201);
    }

    public function decideExpense(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'decision' => 'required|string|in:approuvee,rejetee,decaissee',
        ]);

        return DB::transaction(function () use ($officineId, $id, $validated, $request) {
            $exp = ExpenseRequest::where('officine_id', $officineId)->lockForUpdate()->find($id);
            if (!$exp) {
                return response()->json(['message' => 'Demande de dépense introuvable.'], 404);
            }

            $decision = $validated['decision'];
            if ($decision === 'decaissee' && $exp->cash_session_id) {
                $session = CashSession::where('officine_id', $officineId)->lockForUpdate()->find($exp->cash_session_id);
                if (!$session || $session->status === 'cloturee') {
                    return response()->json(['message' => 'Session clôturée : décaissement impossible.'], 422);
                }

                CashMovement::create([
                    'officine_id' => $officineId,
                    'cash_session_id' => $session->id,
                    'direction' => 'sortie',
                    'category' => 'depense',
                    'amount' => $exp->amount,
                    'reason' => "Décaissement dépense {$exp->reference} : {$exp->reason}",
                    'status' => 'valide',
                    'recorded_by_user_id' => $request->user()?->id ?? 1,
                    'occurred_at' => now(),
                ]);

                $session->update([
                    'expected_closing_balance' => round($session->expected_closing_balance - $exp->amount, 2),
                    'version' => $session->version + 1,
                ]);
            }

            $exp->update([
                'status' => $decision,
                'approved_by_user_id' => $request->user()?->id,
                'approved_at' => $exp->approved_at ?? now(),
                'disbursed_at' => $decision === 'decaissee' ? now() : $exp->disbursed_at,
                'version' => $exp->version + 1,
            ]);

            return response()->json(['data' => $exp]);
        });
    }

    // ==========================================
    // 4. PASSATIONS CONJOINTES (CDC 3.4 & 7)
    // ==========================================

    public function handoversIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.read');
        $officineId = $this->getOfficineId($request);

        $handovers = Handover::with(['session:id,session_ref', 'outgoingUser:id,name', 'incomingUser:id,name'])
            ->where('officine_id', $officineId)
            ->orderByDesc('outgoing_signed_at')
            ->get();

        return response()->json(['data' => $handovers]);
    }

    public function storeHandover(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'cash_session_id' => 'required|integer',
            'incoming_user_id' => 'nullable|integer',
            'counted_cash' => 'required|numeric|min:0',
            'denominations' => 'nullable|array',
            'anomalies_notes' => 'nullable|string',
        ]);

        if (!empty($validated['incoming_user_id']) && !DB::table('officine_user')->where('officine_id', $officineId)->where('user_id', $validated['incoming_user_id'])->where('is_active', true)->exists()) {
            return response()->json(['message' => 'Caissier entrant introuvable ou inactif dans cette officine.'], 404);
        }

        return DB::transaction(function () use ($validated, $officineId, $request) {
            $session = CashSession::with('register')->where('officine_id', $officineId)->lockForUpdate()->find($validated['cash_session_id']);
            if (!$session || $session->status === 'cloturee') {
                return response()->json(['message' => 'Session introuvable ou clôturée.'], 422);
            }

            $theoretical = (float) $session->expected_closing_balance;
            $counted = (float) $validated['counted_cash'];
            $variance = round($counted - $theoretical, 2);
            $threshold = (float) ($session->register?->discrepancy_alert_threshold ?? 1000.0);

            $createdActionId = null;
            if (abs($variance) > $threshold) {
                $action = QualityAction::create([
                    'officine_id' => $officineId,
                    'created_by' => $request->user()?->id ?? 1,
                    'title' => "Écart passation caisse {$session->session_ref} ({$variance} FCFA)",
                    'chapter' => 'Caisse & Finances',
                    'severity' => 'high',
                    'owner' => $request->user()?->name ?? 'Pharmacien Titulaire',
                    'due_date' => now()->addDays(2)->toDateString(),
                    'status' => 'open',
                    'description' => "Théorique : {$theoretical} | Compté passation : {$counted}. Anomalies : " . ($validated['anomalies_notes'] ?? 'Aucune'),
                    'resolution' => '',
                ]);
                $createdActionId = $action->id;
            }

            $handover = Handover::create([
                'officine_id' => $officineId,
                'cash_session_id' => $session->id,
                'outgoing_user_id' => $request->user()?->id ?? 1,
                'incoming_user_id' => $validated['incoming_user_id'] ?? null,
                'theoretical_cash' => $theoretical,
                'counted_cash' => $counted,
                'variance_amount' => $variance,
                'anomalies_notes' => $validated['anomalies_notes'] ?? null,
                'outgoing_signed_at' => now(),
                'status' => abs($variance) > $threshold ? 'ecart_signale' : 'en_attente_entrant',
                'created_action_id' => $createdActionId,
                'version' => 1,
            ]);

            if (!empty($validated['denominations'])) {
                CashCount::create([
                    'officine_id' => $officineId,
                    'cash_session_id' => $session->id,
                    'handover_id' => $handover->id,
                    'count_type' => 'passation',
                    'denominations' => $validated['denominations'],
                    'total_counted' => $counted,
                    'counted_by_user_id' => $request->user()?->id ?? 1,
                    'counted_at' => now(),
                ]);
            }

            $session->update(['status' => 'passation_en_cours', 'version' => $session->version + 1]);
            return response()->json(['data' => $handover], 201);
        });
    }

    public function signIncomingHandover(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.write');
        $officineId = $this->getOfficineId($request);

        return DB::transaction(function () use ($officineId, $id, $request) {
            $handover = Handover::where('officine_id', $officineId)->lockForUpdate()->find($id);
            if (!$handover) {
                return response()->json(['message' => 'Passation introuvable.'], 404);
            }

            // CDC 7 : La passation conserve les écarts calculés lors du comptage conjoint !
            $handover->update([
                'incoming_user_id' => $request->user()?->id,
                'incoming_signed_at' => now(),
                'status' => 'signee',
                'version' => $handover->version + 1,
            ]);

            CashSession::where('officine_id', $officineId)
                ->where('id', $handover->cash_session_id)
                ->update([
                    'cashier_user_id' => $request->user()?->id ?? 1,
                    'status' => 'ouverte',
                ]);

            return response()->json(['data' => $handover]);
        });
    }

    // ==========================================
    // 5. RAPPROCHEMENTS JOURNALIERS (CDC 3.5)
    // ==========================================

    public function reconciliationsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.read');
        $officineId = $this->getOfficineId($request);

        $runs = ReconciliationRun::with(['lines', 'createdBy:id,name', 'closedBy:id,name'])
            ->where('officine_id', $officineId)
            ->orderByDesc('period_date')
            ->get();

        return response()->json(['data' => $runs]);
    }

    public function storeReconciliation(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'tresorerie.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'reference' => 'required|string|max:50',
            'period_date' => 'required|date',
            'lines' => 'required|array|min:1',
            'lines.*.payment_method' => 'required|string|in:especes,mobile_money,carte,credit',
            'lines.*.declared_amount' => 'required|numeric|min:0',
            'lines.*.justification' => 'nullable|string',
        ]);

        if (ReconciliationRun::where('officine_id', $officineId)->where('reference', $validated['reference'])->exists()) {
            return response()->json(['message' => 'Cette référence de rapprochement existe déjà.'], 422);
        }

        return DB::transaction(function () use ($validated, $officineId, $request) {
            $expectedByMethod = PaymentTransaction::where('officine_id', $officineId)
                ->where('transaction_type', 'encaissement')
                ->where('status', 'confirme')
                ->whereDate('occurred_at', $validated['period_date'])
                ->select('payment_method', DB::raw('SUM(amount) as total'))
                ->groupBy('payment_method')
                ->pluck('total', 'payment_method');

            $totalExpected = 0.0;
            $totalDeclared = 0.0;

            $run = ReconciliationRun::create([
                'officine_id' => $officineId,
                'reference' => $validated['reference'],
                'period_date' => $validated['period_date'],
                'status' => 'ouvert',
                'created_by_user_id' => $request->user()?->id ?? 1,
                'version' => 1,
            ]);

            foreach ($validated['lines'] as $l) {
                $exp = round((float) ($expectedByMethod[$l['payment_method']] ?? 0), 2);
                $dec = round((float) $l['declared_amount'], 2);
                $var = round($dec - $exp, 2);

                $totalExpected += $exp;
                $totalDeclared += $dec;

                ReconciliationLine::create([
                    'officine_id' => $officineId,
                    'reconciliation_run_id' => $run->id,
                    'payment_method' => $l['payment_method'],
                    'expected_amount' => $exp,
                    'declared_amount' => $dec,
                    'variance_amount' => $var,
                    'justification' => $l['justification'] ?? null,
                ]);
            }

            $totalVar = round($totalDeclared - $totalExpected, 2);
            $hasLargeVariance = abs($totalVar) > 1000.0;
            $createdActionId = null;

            if ($hasLargeVariance) {
                $action = QualityAction::create([
                    'officine_id' => $officineId,
                    'created_by' => $request->user()?->id ?? 1,
                    'title' => "Écart rapprochement recettes {$validated['period_date']} ({$totalVar} FCFA)",
                    'chapter' => 'Caisse & Finances',
                    'severity' => 'high',
                    'owner' => $request->user()?->name ?? 'Pharmacien Titulaire',
                    'due_date' => now()->addDays(2)->toDateString(),
                    'status' => 'open',
                    'description' => "Attendu : {$totalExpected} | Déclaré : {$totalDeclared}.",
                    'resolution' => '',
                ]);
                $createdActionId = $action->id;
            }

            $run->update([
                'total_expected' => $totalExpected,
                'total_declared' => $totalDeclared,
                'total_variance' => $totalVar,
                'status' => abs($totalVar) > 0.01 ? 'ecart_a_justifier' : 'cloture',
                'closed_by_user_id' => abs($totalVar) <= 0.01 ? $request->user()?->id : null,
                'closed_at' => abs($totalVar) <= 0.01 ? now() : null,
                'created_action_id' => $createdActionId,
            ]);

            return response()->json(['data' => $run->load('lines')], 201);
        });
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Dispensation\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Dispensation\Models\Credit;
use App\Modules\Dispensation\Models\DispensingEvent;
use App\Modules\Dispensation\Models\PharmaceuticalReview;
use App\Modules\Dispensation\Models\PrescriptionReference;
use App\Modules\Dispensation\Models\SafetyReport;
use App\Modules\Dispensation\Models\Sale;
use App\Modules\Dispensation\Models\SaleLine;
use App\Modules\Dispensation\Models\SaleReturn;
use App\Modules\Qualite\Models\QualityAction;
use App\Modules\Stock\Models\Lot;
use App\Modules\Stock\Models\Product;
use App\Modules\Stock\Models\QuarantineEvent;
use App\Modules\Stock\Models\StockMovement;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class Module12DispensationVenteController extends Controller
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
        if (empty($perms)) {
            return;
        }

        $altPerm = str_starts_with($permission, 'dispensation.')
            ? str_replace('dispensation.', 'qualite.', $permission)
            : str_replace('qualite.', 'dispensation.', $permission);

        abort_unless(
            in_array($permission, $perms, true)
            || in_array($altPerm, $perms, true)
            || in_array('caisse.sell', $perms, true)
            || in_array('admin', $perms, true),
            403,
            "Permission {$permission} requise."
        );
    }

    /**
     * Indicateurs consolidés Dispensation & Vente (CDC 6)
     */
    public function overview(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'dispensation.read');
        $officineId = $this->getOfficineId($request);

        $totalSales = Sale::where('officine_id', $officineId)->count();
        $paidSales = Sale::where('officine_id', $officineId)->where('status', 'payee')->count();
        $pendingSales = Sale::where('officine_id', $officineId)->whereIn('status', ['brouillon', 'en_analyse', 'validee', 'transmise_caisse'])->count();
        $cancelledSales = Sale::where('officine_id', $officineId)->where('status', 'annulee')->count();

        $totalReturns = SaleReturn::where('officine_id', $officineId)->count();
        $pendingReturns = SaleReturn::where('officine_id', $officineId)->where('status', 'demande')->count();
        $safetyReportsCount = SafetyReport::where('officine_id', $officineId)->count();

        $totalReviews = PharmaceuticalReview::where('officine_id', $officineId)->count();
        $approvedReviews = PharmaceuticalReview::where('officine_id', $officineId)->whereIn('decision', ['approuve', 'substitution'])->count();

        $approvalRate = $totalReviews > 0
            ? round(($approvedReviews / $totalReviews) * 100, 1)
            : 'non disponible';

        return response()->json([
            'meta' => [
                'officine_id' => $officineId,
                'as_of' => now()->toIso8601String(),
                'period' => 'cumul_courant',
            ],
            'kpis' => [
                'total_sales' => $totalSales,
                'paid_sales' => $paidSales,
                'pending_sales' => $pendingSales,
                'cancelled_sales' => $cancelledSales,
                'total_returns' => $totalReturns,
                'pending_returns' => $pendingReturns,
                'safety_reports_count' => $safetyReportsCount,
                'review_approval_rate' => $approvalRate,
            ],
        ]);
    }

    // ==========================================
    // 1. VENTES & PARCOURS COMPTOIR (CDC 3.1 - 3.4)
    // ==========================================

    public function salesIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'dispensation.read');
        $officineId = $this->getOfficineId($request);

        $query = Sale::with([
            'lines.product:id,code,name,base_unit',
            'lines.lot:id,batch_number,expiry_date,status',
            'prescription',
            'reviews.pharmacist:id,name',
            'credits',
        ])->where('officine_id', $officineId);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('sale_type')) {
            $query->where('sale_type', $request->query('sale_type'));
        }
        if ($request->filled('search')) {
            $s = '%' . $request->query('search') . '%';
            $query->where(function ($q) use ($s) {
                $q->where('reference', 'ilike', $s)
                    ->orWhere('patient_minimized_ref', 'ilike', $s);
            });
        }

        return response()->json(['data' => $query->orderByDesc('id')->get()]);
    }

    public function storeSale(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'dispensation.write');
        $officineId = $this->getOfficineId($request);
        $today = Carbon::today()->toDateString();

        $validated = $request->validate([
            'reference' => 'required|string|max:50',
            'idempotency_key' => 'nullable|string|max:100',
            'sale_type' => 'sometimes|string|in:comptoir_libre,ordonnance,conseil',
            'patient_minimized_ref' => 'nullable|string|max:80',
            'notes' => 'nullable|string',
            'prescription' => 'nullable|array',
            'prescription.prescription_ref' => 'required_with:prescription|string|max:80',
            'prescription.prescription_date' => 'required_with:prescription|date',
            'prescription.prescriber_name' => 'nullable|string|max:120',
            'prescription.is_controlled_substance' => 'sometimes|boolean',
            'lines' => 'required|array|min:1',
            'lines.*.product_id' => 'required|integer',
            'lines.*.lot_id' => 'nullable|integer',
            'lines.*.quantity' => 'required|integer|min:1',
            'lines.*.unit_price' => 'nullable|numeric|min:0',
            'lines.*.dispensing_advice' => 'nullable|string',
            'lines.*.is_substituted' => 'sometimes|boolean',
            'lines.*.substitution_reason' => 'nullable|string|max:200',
        ]);

        if (!empty($validated['idempotency_key'])) {
            $existing = Sale::where('officine_id', $officineId)
                ->where('idempotency_key', $validated['idempotency_key'])
                ->first();
            if ($existing) {
                return response()->json([
                    'data' => $existing->load(['lines.product:id,code,name', 'prescription']),
                    'replayed' => true,
                ], 200);
            }
        }

        if (Sale::where('officine_id', $officineId)->where('reference', $validated['reference'])->exists()) {
            return response()->json(['message' => 'Cette référence de vente existe déjà.'], 422);
        }

        // Vérification préalable des lots et produits
        $computedTotal = 0.0;
        $preparedLines = [];

        foreach ($validated['lines'] as $l) {
            $product = Product::where('officine_id', $officineId)->find($l['product_id']);
            if (!$product) {
                return response()->json(['message' => "Produit #{$l['product_id']} introuvable."], 404);
            }

            if (!empty($l['lot_id'])) {
                $lot = Lot::where('officine_id', $officineId)
                    ->where('product_id', $product->id)
                    ->find($l['lot_id']);
                if (!$lot) {
                    return response()->json(['message' => "Lot #{$l['lot_id']} introuvable."], 404);
                }
                if (!$lot->is_sellable || $lot->status !== 'disponible' || $lot->expiry_date <= $today) {
                    return response()->json(['message' => "Lot {$lot->batch_number} bloqué (périmé ou en quarantaine)."], 422);
                }
            }

            $unitPrice = isset($l['unit_price']) ? (float) $l['unit_price'] : (float) $product->selling_price;
            $lineTotal = round($unitPrice * (int) $l['quantity'], 2);
            $computedTotal += $lineTotal;

            $preparedLines[] = [
                'product' => $product,
                'lot_id' => $l['lot_id'] ?? null,
                'quantity' => (int) $l['quantity'],
                'unit_price' => $unitPrice,
                'line_total' => $lineTotal,
                'dispensing_advice' => $l['dispensing_advice'] ?? null,
                'is_substituted' => (bool) ($l['is_substituted'] ?? false),
                'substitution_reason' => $l['substitution_reason'] ?? null,
            ];
        }

        return DB::transaction(function () use ($validated, $officineId, $computedTotal, $preparedLines) {
            $saleType = $validated['sale_type'] ?? 'comptoir_libre';
            $initialStatus = $saleType === 'ordonnance' ? 'en_analyse' : 'brouillon';

            $sale = Sale::create([
                'officine_id' => $officineId,
                'reference' => $validated['reference'],
                'idempotency_key' => $validated['idempotency_key'] ?? null,
                'sale_type' => $saleType,
                'status' => $initialStatus,
                'patient_minimized_ref' => $validated['patient_minimized_ref'] ?? null,
                'total_amount' => round($computedTotal, 2),
                'payment_status' => 'en_attente',
                'notes' => $validated['notes'] ?? null,
                'version' => 1,
            ]);

            foreach ($preparedLines as $pl) {
                SaleLine::create([
                    'officine_id' => $officineId,
                    'sale_id' => $sale->id,
                    'product_id' => $pl['product']->id,
                    'lot_id' => $pl['lot_id'],
                    'quantity' => $pl['quantity'],
                    'unit_price' => $pl['unit_price'],
                    'line_total' => $pl['line_total'],
                    'dispensing_advice' => $pl['dispensing_advice'],
                    'is_substituted' => $pl['is_substituted'],
                    'substitution_reason' => $pl['substitution_reason'],
                ]);
            }

            if (!empty($validated['prescription'])) {
                $pr = $validated['prescription'];
                PrescriptionReference::create([
                    'officine_id' => $officineId,
                    'sale_id' => $sale->id,
                    'prescription_ref' => $pr['prescription_ref'],
                    'prescription_date' => $pr['prescription_date'],
                    'prescriber_name' => $pr['prescriber_name'] ?? null,
                    'is_controlled_substance' => (bool) ($pr['is_controlled_substance'] ?? false),
                ]);
            }

            return response()->json([
                'data' => $sale->load(['lines.product:id,code,name', 'prescription']),
                'replayed' => false,
            ], 201);
        });
    }

    public function reviewSale(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'dispensation.write');
        $officineId = $this->getOfficineId($request);

        $sale = Sale::where('officine_id', $officineId)->find($id);
        if (!$sale) {
            return response()->json(['message' => 'Vente non trouvée.'], 404);
        }

        if ($sale->status === 'payee' || $sale->status === 'annulee') {
            return response()->json(['message' => 'Impossible d’analyser une vente clôturée ou annulée.'], 422);
        }

        $validated = $request->validate([
            'decision' => 'required|string|in:approuve,reserve,refuse,substitution',
            'posology_checked' => 'sometimes|boolean',
            'interactions_checked' => 'sometimes|boolean',
            'contraindications_checked' => 'sometimes|boolean',
            'clinical_notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($sale, $validated, $officineId, $request) {
            $review = PharmaceuticalReview::create([
                'officine_id' => $officineId,
                'sale_id' => $sale->id,
                'pharmacist_user_id' => $request->user()?->id ?? 1,
                'decision' => $validated['decision'],
                'posology_checked' => (bool) ($validated['posology_checked'] ?? true),
                'interactions_checked' => (bool) ($validated['interactions_checked'] ?? true),
                'contraindications_checked' => (bool) ($validated['contraindications_checked'] ?? true),
                'clinical_notes' => $validated['clinical_notes'] ?? null,
                'reviewed_at' => now(),
                'version' => 1,
            ]);

            $newStatus = $validated['decision'] === 'refuse' ? 'annulee' : 'validee';
            $sale->update([
                'status' => $newStatus,
                'validated_by_user_id' => $request->user()?->id,
                'validated_at' => now(),
                'version' => $sale->version + 1,
            ]);

            return response()->json(['data' => $review, 'sale_status' => $newStatus], 201);
        });
    }

    /**
     * Valider et encaisser une vente avec décrément FEFO atomique (CDC 3.4 & 7)
     */
    public function confirmSale(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'dispensation.write');
        $officineId = $this->getOfficineId($request);
        $today = Carbon::today()->toDateString();

        $validated = $request->validate([
            'payment_status' => 'required|string|in:confirme,annule',
            'payment_method' => 'required_if:payment_status,confirme|nullable|string|in:especes,mobile_money,carte,credit',
            'counsel_given' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($officineId, $id, $validated, $today, $request) {
            $sale = Sale::with('lines')->where('officine_id', $officineId)->lockForUpdate()->find($id);
            if (!$sale) {
                return response()->json(['message' => 'Vente introuvable.'], 404);
            }

            if ($sale->status === 'payee') {
                return response()->json(['data' => $sale->load('dispensingEvents'), 'replayed' => true], 200);
            }
            if ($sale->status === 'annulee') {
                return response()->json(['message' => 'Cette vente est déjà annulée.'], 422);
            }

            // CDC 7 : Paiement annulé ne crée pas de vente fantôme ni de mouvement stock
            if ($validated['payment_status'] === 'annule') {
                $sale->update([
                    'status' => 'annulee',
                    'payment_status' => 'annule',
                    'version' => $sale->version + 1,
                ]);
                return response()->json(['data' => $sale, 'stock_decremented' => false]);
            }

            // Ordonnance exige analyse pharmaceutique validée
            if ($sale->sale_type === 'ordonnance' && $sale->status === 'en_analyse') {
                return response()->json(['message' => 'Une ordonnance exige une analyse pharmaceutique préalable.'], 422);
            }

            foreach ($sale->lines as $line) {
                $remaining = $line->quantity;

                $lotsQuery = Lot::where('officine_id', $officineId)
                    ->where('product_id', $line->product_id)
                    ->where('is_sellable', true)
                    ->where('status', 'disponible')
                    ->where('available_qty', '>', 0)
                    ->where('expiry_date', '>', $today);

                if ($line->lot_id) {
                    $lotsQuery->where('id', $line->lot_id);
                }

                $lots = $lotsQuery->orderBy('expiry_date')->lockForUpdate()->get();

                if ($lots->sum('available_qty') < $remaining) {
                    abort(422, "Stock FEFO admissible insuffisant pour le produit #{$line->product_id} (lot bloqué, périmé ou épuisé).");
                }

                foreach ($lots as $lot) {
                    if ($remaining <= 0) {
                        break;
                    }
                    $take = min($remaining, $lot->available_qty);
                    $newBalance = $lot->available_qty - $take;
                    $lot->update([
                        'available_qty' => $newBalance,
                        'status' => $newBalance === 0 ? 'epuise' : 'disponible',
                        'version' => $lot->version + 1,
                    ]);

                    if (!$line->lot_id) {
                        $line->update(['lot_id' => $lot->id]);
                    }

                    StockMovement::create([
                        'officine_id' => $officineId,
                        'product_id' => $line->product_id,
                        'lot_id' => $lot->id,
                        'movement_type' => 'vente',
                        'quantity_delta' => -$take,
                        'balance_after' => $newBalance,
                        'reference_type' => 'sale',
                        'reference_id' => $sale->id,
                        'reason' => "Dispensation vente {$sale->reference}",
                        'performed_by_user_id' => $request->user()?->id ?? 1,
                        'performed_at' => now(),
                    ]);

                    DispensingEvent::create([
                        'officine_id' => $officineId,
                        'sale_id' => $sale->id,
                        'sale_line_id' => $line->id,
                        'lot_id' => $lot->id,
                        'product_id' => $line->product_id,
                        'quantity_dispensed' => $take,
                        'dispensed_by_user_id' => $request->user()?->id ?? 1,
                        'dispensed_at' => now(),
                        'counsel_given' => $validated['counsel_given'] ?? $line->dispensing_advice,
                    ]);

                    $remaining -= $take;
                }
            }

            $sale->update([
                'status' => 'payee',
                'payment_status' => 'confirme',
                'payment_method' => $validated['payment_method'],
                'cashier_user_id' => $request->user()?->id,
                'paid_at' => now(),
                'version' => $sale->version + 1,
            ]);

            return response()->json([
                'data' => $sale->load(['lines.lot:id,batch_number', 'dispensingEvents']),
                'stock_decremented' => true,
            ]);
        });
    }

    // ==========================================
    // 2. RETOURS & AVOIRS (CDC 3.5 & 7)
    // ==========================================

    public function returnsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'dispensation.read');
        $officineId = $this->getOfficineId($request);

        $returns = SaleReturn::with(['sale:id,reference,total_amount', 'product:id,code,name', 'lot:id,batch_number', 'evaluatedBy:id,name'])
            ->where('officine_id', $officineId)
            ->orderByDesc('id')
            ->get();

        return response()->json(['data' => $returns]);
    }

    public function storeReturn(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'dispensation.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'reference' => 'required|string|max:50',
            'sale_id' => 'required|integer',
            'product_id' => 'required|integer',
            'lot_id' => 'nullable|integer',
            'quantity_returned' => 'required|integer|min:1',
            'reason' => 'required|string',
        ]);

        $sale = Sale::where('officine_id', $officineId)->find($validated['sale_id']);
        if (!$sale || $sale->status !== 'payee') {
            return response()->json(['message' => 'Retour impossible : vente introuvable ou non payée.'], 422);
        }

        if (SaleReturn::where('officine_id', $officineId)->where('reference', $validated['reference'])->exists()) {
            return response()->json(['message' => 'Cette référence de retour existe déjà.'], 422);
        }

        // CDC 7 : les retours ne réintègrent PAS automatiquement un lot vendable
        $return = SaleReturn::create([
            'officine_id' => $officineId,
            'reference' => $validated['reference'],
            'sale_id' => $sale->id,
            'product_id' => $validated['product_id'],
            'lot_id' => $validated['lot_id'] ?? null,
            'quantity_returned' => $validated['quantity_returned'],
            'reason' => $validated['reason'],
            'pharmacist_decision' => 'en_attente',
            'status' => 'demande',
            'requested_by_user_id' => $request->user()?->id ?? 1,
            'version' => 1,
        ]);

        return response()->json(['data' => $return], 201);
    }

    public function evaluateReturn(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'dispensation.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'pharmacist_decision' => 'required|string|in:quarantaine,destruction,reintegration_validee',
            'issue_credit_amount' => 'nullable|numeric|min:0',
        ]);

        return DB::transaction(function () use ($officineId, $id, $validated, $request) {
            $ret = SaleReturn::with('sale')->where('officine_id', $officineId)->lockForUpdate()->find($id);
            if (!$ret) {
                return response()->json(['message' => 'Demande de retour non trouvée.'], 404);
            }
            if ($ret->status !== 'demande') {
                return response()->json(['message' => 'Ce retour a déjà été évalué.'], 422);
            }

            $decision = $validated['pharmacist_decision'];
            $createdActionId = null;

            if ($decision === 'quarantaine' || $decision === 'destruction') {
                $action = QualityAction::create([
                    'officine_id' => $officineId,
                    'created_by' => $request->user()?->id ?? 1,
                    'title' => "Retour patient ({$decision}) — {$ret->reference}",
                    'chapter' => 'Dispensation & Retours',
                    'severity' => 'medium',
                    'owner' => $request->user()?->name ?? 'Pharmacien Titulaire',
                    'due_date' => now()->addDays(5)->toDateString(),
                    'status' => 'open',
                    'description' => "Motif retour : {$ret->reason}. Décision pharmacien : {$decision}.",
                    'resolution' => '',
                ]);
                $createdActionId = $action->id;

                if ($ret->lot_id) {
                    QuarantineEvent::create([
                        'officine_id' => $officineId,
                        'lot_id' => $ret->lot_id,
                        'product_id' => $ret->product_id,
                        'event_type' => $decision === 'destruction' ? 'destruction' : 'quarantaine',
                        'quantity' => $ret->quantity_returned,
                        'reason' => "Suite retour patient {$ret->reference} : {$ret->reason}",
                        'proof_reference' => $ret->reference,
                        'status' => 'valide',
                        'initiated_by_user_id' => $request->user()?->id ?? 1,
                        'validated_by_user_id' => $request->user()?->id,
                        'validated_at' => now(),
                        'created_action_id' => $createdActionId,
                        'version' => 1,
                    ]);
                }
            } elseif ($decision === 'reintegration_validee' && $ret->lot_id) {
                $lot = Lot::where('officine_id', $officineId)->lockForUpdate()->find($ret->lot_id);
                if ($lot) {
                    if ($lot->expiry_date <= Carbon::today()->toDateString() || $lot->status === 'rappele') {
                        abort(422, 'Réintégration refusée : lot périmé ou rappelé.');
                    }
                    $newBal = $lot->available_qty + $ret->quantity_returned;
                    $lot->update([
                        'available_qty' => $newBal,
                        'status' => 'disponible',
                        'is_sellable' => true,
                        'version' => $lot->version + 1,
                    ]);
                    StockMovement::create([
                        'officine_id' => $officineId,
                        'product_id' => $lot->product_id,
                        'lot_id' => $lot->id,
                        'movement_type' => 'inventaire_plus',
                        'quantity_delta' => $ret->quantity_returned,
                        'balance_after' => $newBal,
                        'reference_type' => 'return',
                        'reference_id' => $ret->id,
                        'reason' => "Réintégration validée par pharmacien ({$ret->reference})",
                        'performed_by_user_id' => $request->user()?->id ?? 1,
                        'performed_at' => now(),
                    ]);
                }
            }

            if (!empty($validated['issue_credit_amount']) && $validated['issue_credit_amount'] > 0) {
                $creditAmt = (float) $validated['issue_credit_amount'];
                $existingCredits = (float) Credit::where('officine_id', $officineId)->where('sale_id', $ret->sale_id)->sum('amount');
                if ($existingCredits + $creditAmt > $ret->sale->total_amount) {
                    abort(422, 'Le montant de l’avoir dépasse le montant payé sur la vente d’origine.');
                }

                Credit::create([
                    'officine_id' => $officineId,
                    'credit_ref' => "AV-{$ret->reference}",
                    'sale_id' => $ret->sale_id,
                    'return_id' => $ret->id,
                    'amount' => $creditAmt,
                    'status' => 'emis',
                    'issued_by_user_id' => $request->user()?->id ?? 1,
                    'issued_at' => now(),
                    'reason' => "Avoir suite retour {$ret->reference}",
                    'version' => 1,
                ]);
            }

            $ret->update([
                'pharmacist_decision' => $decision,
                'status' => 'evalue',
                'evaluated_by_user_id' => $request->user()?->id,
                'evaluated_at' => now(),
                'created_action_id' => $createdActionId,
                'version' => $ret->version + 1,
            ]);

            return response()->json(['data' => $ret]);
        });
    }

    public function creditsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'dispensation.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => Credit::with('sale:id,reference,total_amount')
                ->where('officine_id', $officineId)
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    // ==========================================
    // 3. SIGNALEMENTS QUALITÉ & VIGILANCE (CDC 3.6)
    // ==========================================

    public function safetyReportsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'dispensation.read');
        $officineId = $this->getOfficineId($request);

        $reports = SafetyReport::with(['product:id,code,name', 'lot:id,batch_number', 'reportedBy:id,name'])
            ->where('officine_id', $officineId)
            ->orderByDesc('reported_at')
            ->get();

        return response()->json(['data' => $reports]);
    }

    public function storeSafetyReport(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'dispensation.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'reference' => 'required|string|max:50',
            'sale_id' => 'nullable|integer',
            'product_id' => 'nullable|integer',
            'lot_id' => 'nullable|integer',
            'report_type' => 'required|string|in:defaut_qualite,effet_indesirable,erreur_dispensation,contrefacon_suspectee',
            'severity' => 'sometimes|string|in:faible,modere,grave',
            'description' => 'required|string',
            'external_ack_ref' => 'nullable|string|max:120',
        ]);

        if (SafetyReport::where('officine_id', $officineId)->where('reference', $validated['reference'])->exists()) {
            return response()->json(['message' => 'Cette référence de signalement existe déjà.'], 422);
        }

        return DB::transaction(function () use ($validated, $officineId, $request) {
            $severity = $validated['severity'] ?? 'modere';
            $action = QualityAction::create([
                'officine_id' => $officineId,
                'created_by' => $request->user()?->id ?? 1,
                'title' => "Signalement {$validated['report_type']} ({$validated['reference']})",
                'chapter' => 'Pharmacovigilance & Dispensation',
                'severity' => $severity === 'grave' ? 'critical' : 'high',
                'owner' => $request->user()?->name ?? 'Pharmacien Titulaire',
                'due_date' => now()->addDays(2)->toDateString(),
                'status' => 'open',
                'description' => $validated['description'],
                'resolution' => '',
            ]);

            // CDC 5 : aucune transmission officielle prétendue sans accusé effectif
            $hasAck = !empty($validated['external_ack_ref']);

            $report = SafetyReport::create([
                'officine_id' => $officineId,
                'reference' => $validated['reference'],
                'sale_id' => $validated['sale_id'] ?? null,
                'product_id' => $validated['product_id'] ?? null,
                'lot_id' => $validated['lot_id'] ?? null,
                'report_type' => $validated['report_type'],
                'severity' => $severity,
                'description' => $validated['description'],
                'external_transmission_status' => $hasAck ? 'transmis_avec_accuse' : 'local_uniquement',
                'external_ack_ref' => $hasAck ? $validated['external_ack_ref'] : null,
                'reported_by_user_id' => $request->user()?->id ?? 1,
                'reported_at' => now(),
                'created_action_id' => $action->id,
                'version' => 1,
            ]);

            return response()->json(['data' => $report], 201);
        });
    }
}

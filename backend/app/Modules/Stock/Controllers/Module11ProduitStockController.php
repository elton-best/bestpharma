<?php

declare(strict_types=1);

namespace App\Modules\Stock\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Qualite\Models\QualityAction;
use App\Modules\Stock\Models\Inventory;
use App\Modules\Stock\Models\InventoryLine;
use App\Modules\Stock\Models\Lot;
use App\Modules\Stock\Models\OrderLine;
use App\Modules\Stock\Models\Product;
use App\Modules\Stock\Models\ProductUnit;
use App\Modules\Stock\Models\PurchaseOrder;
use App\Modules\Stock\Models\QuarantineEvent;
use App\Modules\Stock\Models\Receipt;
use App\Modules\Stock\Models\ReceiptLine;
use App\Modules\Stock\Models\StockMovement;
use App\Modules\Stock\Models\TemperatureReading;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class Module11ProduitStockController extends Controller
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

        $altPerm = str_starts_with($permission, 'stock.')
            ? str_replace('stock.', 'qualite.', $permission)
            : str_replace('qualite.', 'stock.', $permission);

        abort_unless(
            in_array($permission, $perms, true)
            || in_array($altPerm, $perms, true)
            || in_array('admin', $perms, true),
            403,
            "Permission {$permission} requise."
        );
    }

    /**
     * Indicateurs consolidés Produits, Approvisionnements & Stocks (CDC 6)
     */
    public function overview(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'stock.read');
        $officineId = $this->getOfficineId($request);
        $today = Carbon::today()->toDateString();
        $in90Days = Carbon::today()->addDays(90)->toDateString();

        $products = Product::where('officine_id', $officineId)->where('is_active', true)->get();
        $totalProducts = $products->count();

        // Stock vendable par produit
        $sellableByProduct = Lot::where('officine_id', $officineId)
            ->where('is_sellable', true)
            ->where('status', 'disponible')
            ->where('expiry_date', '>', $today)
            ->select('product_id', DB::raw('SUM(available_qty) as total_qty'))
            ->groupBy('product_id')
            ->pluck('total_qty', 'product_id');

        $belowThreshold = $products->filter(function ($p) use ($sellableByProduct) {
            $qty = (int) ($sellableByProduct[$p->id] ?? 0);
            return $qty < $p->min_stock_threshold;
        })->count();

        $pendingOrders = PurchaseOrder::where('officine_id', $officineId)
            ->whereIn('status', ['brouillon', 'a_approuver', 'approuve', 'emis', 'partiel'])
            ->count();

        $activeLotsTotal = Lot::where('officine_id', $officineId)->where('available_qty', '>', 0)->count();
        $availableLots = Lot::where('officine_id', $officineId)
            ->where('available_qty', '>', 0)
            ->where('status', 'disponible')
            ->where('is_sellable', true)
            ->count();

        $expiringSoonLots = Lot::where('officine_id', $officineId)
            ->where('available_qty', '>', 0)
            ->whereBetween('expiry_date', [$today, $in90Days])
            ->count();

        $quarantineLots = Lot::where('officine_id', $officineId)
            ->where('available_qty', '>', 0)
            ->whereIn('status', ['quarantaine', 'rappele'])
            ->count();

        $openColdIncidents = TemperatureReading::where('officine_id', $officineId)
            ->where('is_excursion', true)
            ->where('effectiveness_status', 'incident_ouvert')
            ->count();

        $conformityRate = $activeLotsTotal > 0
            ? round(($availableLots / $activeLotsTotal) * 100, 1)
            : 'non disponible';

        return response()->json([
            'meta' => [
                'officine_id' => $officineId,
                'as_of' => now()->toIso8601String(),
                'period' => '90_jours_glissants',
            ],
            'kpis' => [
                'total_products' => $totalProducts,
                'below_threshold_products' => $belowThreshold,
                'pending_orders' => $pendingOrders,
                'total_lots_available' => $availableLots,
                'expiring_soon_lots' => $expiringSoonLots,
                'quarantine_lots' => $quarantineLots,
                'cold_chain_excursions' => $openColdIncidents,
                'stock_conformity_rate' => $conformityRate,
            ],
        ]);
    }

    // ==========================================
    // 1. CATALOGUE PRODUITS & UNITÉS (CDC 3.1)
    // ==========================================

    public function productsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'stock.read');
        $officineId = $this->getOfficineId($request);
        $today = Carbon::today()->toDateString();

        $query = Product::with(['supplier:id,code,name', 'units'])
            ->where('officine_id', $officineId);

        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }
        if ($request->filled('is_thermosensitive')) {
            $query->where('is_thermosensitive', filter_var($request->query('is_thermosensitive'), FILTER_VALIDATE_BOOLEAN));
        }
        if ($request->filled('search')) {
            $s = '%' . $request->query('search') . '%';
            $query->where(function ($q) use ($s) {
                $q->where('code', 'ilike', $s)
                    ->orWhere('name', 'ilike', $s)
                    ->orWhere('dci', 'ilike', $s)
                    ->orWhere('barcode', 'ilike', $s);
            });
        }

        $products = $query->orderBy('name')->get();

        $stocks = Lot::where('officine_id', $officineId)
            ->where('is_sellable', true)
            ->where('status', 'disponible')
            ->where('expiry_date', '>', $today)
            ->select('product_id', DB::raw('SUM(available_qty) as sellable_qty'))
            ->groupBy('product_id')
            ->pluck('sellable_qty', 'product_id');

        $products->transform(function ($p) use ($stocks) {
            $p->setAttribute('sellable_stock', (int) ($stocks[$p->id] ?? 0));
            return $p;
        });

        return response()->json(['data' => $products]);
    }

    public function storeProduct(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'stock.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'barcode' => 'nullable|string|max:50',
            'name' => 'required|string|max:180',
            'dci' => 'nullable|string|max:150',
            'dosage' => 'nullable|string|max:80',
            'pharmaceutical_form' => 'nullable|string|max:80',
            'base_unit' => 'sometimes|string|max:50',
            'category' => 'sometimes|string|in:medicament,parapharmacie,dispositif_medical,stupefiant,reactif,autre',
            'default_supplier_id' => 'nullable|integer',
            'storage_condition' => 'sometimes|string|in:ambiant,froid_2_8,congele,controle_b',
            'is_thermosensitive' => 'sometimes|boolean',
            'min_stock_threshold' => 'sometimes|integer|min:0',
            'reorder_quantity' => 'sometimes|integer|min:1',
            'purchase_price' => 'sometimes|numeric|min:0',
            'selling_price' => 'sometimes|numeric|min:0',
            'amm_number' => 'nullable|string|max:80',
            'amm_source_verified' => 'sometimes|boolean',
            'amm_source_label' => 'nullable|string|max:150',
            'units' => 'nullable|array',
            'units.*.unit_name' => 'required_with:units|string|max:50',
            'units.*.conversion_factor' => 'required_with:units|integer|min:1',
            'units.*.is_default_dispense' => 'sometimes|boolean',
        ]);

        if (Product::where('officine_id', $officineId)->where('code', $validated['code'])->exists()) {
            return response()->json(['message' => 'Ce code produit existe déjà dans le catalogue.'], 422);
        }

        // CDC 3.1 : ne pas affirmer une AMM sans source officielle vérifiée
        $ammVerified = !empty($validated['amm_source_label']) && !empty($validated['amm_source_verified']);

        return DB::transaction(function () use ($validated, $officineId, $ammVerified) {
            $product = Product::create([
                'officine_id' => $officineId,
                'code' => strtoupper($validated['code']),
                'barcode' => $validated['barcode'] ?? null,
                'name' => $validated['name'],
                'dci' => $validated['dci'] ?? null,
                'dosage' => $validated['dosage'] ?? null,
                'pharmaceutical_form' => $validated['pharmaceutical_form'] ?? null,
                'base_unit' => $validated['base_unit'] ?? 'Boîte',
                'category' => $validated['category'] ?? 'medicament',
                'default_supplier_id' => $validated['default_supplier_id'] ?? null,
                'storage_condition' => $validated['storage_condition'] ?? 'ambiant',
                'is_thermosensitive' => $validated['is_thermosensitive'] ?? (($validated['storage_condition'] ?? 'ambiant') === 'froid_2_8'),
                'min_stock_threshold' => $validated['min_stock_threshold'] ?? 10,
                'reorder_quantity' => $validated['reorder_quantity'] ?? 30,
                'purchase_price' => $validated['purchase_price'] ?? 0,
                'selling_price' => $validated['selling_price'] ?? 0,
                'amm_number' => $validated['amm_number'] ?? null,
                'amm_source_verified' => $ammVerified,
                'amm_source_label' => $ammVerified ? $validated['amm_source_label'] : null,
                'is_active' => true,
                'version' => 1,
            ]);

            if (!empty($validated['units'])) {
                foreach ($validated['units'] as $u) {
                    ProductUnit::create([
                        'officine_id' => $officineId,
                        'product_id' => $product->id,
                        'unit_name' => $u['unit_name'],
                        'conversion_factor' => $u['conversion_factor'],
                        'is_default_dispense' => $u['is_default_dispense'] ?? false,
                    ]);
                }
            }

            return response()->json(['data' => $product->load(['units', 'supplier:id,code,name'])], 201);
        });
    }

    public function updateProduct(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'stock.write');
        $officineId = $this->getOfficineId($request);

        $product = Product::where('officine_id', $officineId)->find($id);
        if (!$product) {
            return response()->json(['message' => 'Produit non trouvé.'], 404);
        }

        if ($request->has('version') && (int) $request->input('version') !== (int) $product->version) {
            return response()->json(['message' => 'Conflit de version concurrentielle (409).'], 409);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:180',
            'min_stock_threshold' => 'sometimes|integer|min:0',
            'reorder_quantity' => 'sometimes|integer|min:1',
            'purchase_price' => 'sometimes|numeric|min:0',
            'selling_price' => 'sometimes|numeric|min:0',
            'storage_condition' => 'sometimes|string|in:ambiant,froid_2_8,congele,controle_b',
            'is_thermosensitive' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
        ]);

        $product->update([
            ...$validated,
            'version' => $product->version + 1,
        ]);

        return response()->json(['data' => $product]);
    }

    // ==========================================
    // 2. COMMANDES & SUGGESTIONS (CDC 3.2)
    // ==========================================

    public function orderSuggestions(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'stock.read');
        $officineId = $this->getOfficineId($request);
        $today = Carbon::today()->toDateString();

        $products = Product::with('supplier:id,code,name')
            ->where('officine_id', $officineId)
            ->where('is_active', true)
            ->get();

        $stocks = Lot::where('officine_id', $officineId)
            ->where('is_sellable', true)
            ->where('status', 'disponible')
            ->where('expiry_date', '>', $today)
            ->select('product_id', DB::raw('SUM(available_qty) as sellable_qty'))
            ->groupBy('product_id')
            ->pluck('sellable_qty', 'product_id');

        $suggestions = [];
        foreach ($products as $p) {
            $current = (int) ($stocks[$p->id] ?? 0);
            if ($current < $p->min_stock_threshold) {
                $deficit = $p->min_stock_threshold - $current;
                $suggestedQty = max($p->reorder_quantity, $deficit);
                $suggestions[] = [
                    'product_id' => $p->id,
                    'code' => $p->code,
                    'name' => $p->name,
                    'supplier_id' => $p->default_supplier_id,
                    'supplier_name' => $p->supplier?->name,
                    'current_sellable_stock' => $current,
                    'min_stock_threshold' => $p->min_stock_threshold,
                    'suggested_qty' => $suggestedQty,
                    'unit_price' => $p->purchase_price,
                    'origin_formula' => 'max(reorder_quantity, min_stock_threshold - sellable_stock)',
                ];
            }
        }

        return response()->json(['data' => $suggestions]);
    }

    public function ordersIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'stock.read');
        $officineId = $this->getOfficineId($request);

        $orders = PurchaseOrder::with(['supplier:id,code,name', 'lines.product:id,code,name,base_unit', 'approvedBy:id,name'])
            ->where('officine_id', $officineId)
            ->orderByDesc('order_date')
            ->orderByDesc('id')
            ->get();

        return response()->json(['data' => $orders]);
    }

    public function storeOrder(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'stock.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'reference' => 'required|string|max:50',
            'supplier_id' => 'required|integer',
            'order_date' => 'required|date',
            'expected_delivery_date' => 'nullable|date',
            'suggestion_origin' => 'nullable|array',
            'notes' => 'nullable|string',
            'lines' => 'required|array|min:1',
            'lines.*.product_id' => 'required|integer',
            'lines.*.ordered_qty' => 'required|integer|min:1',
            'lines.*.unit_price' => 'required|numeric|min:0',
        ]);

        if (PurchaseOrder::where('officine_id', $officineId)->where('reference', $validated['reference'])->exists()) {
            return response()->json(['message' => 'Cette référence de commande existe déjà.'], 422);
        }

        return DB::transaction(function () use ($validated, $officineId, $request) {
            $total = 0.0;
            foreach ($validated['lines'] as $l) {
                $total += ((int) $l['ordered_qty']) * ((float) $l['unit_price']);
            }

            $order = PurchaseOrder::create([
                'officine_id' => $officineId,
                'reference' => $validated['reference'],
                'supplier_id' => $validated['supplier_id'],
                'status' => 'a_approuver',
                'order_date' => $validated['order_date'],
                'expected_delivery_date' => $validated['expected_delivery_date'] ?? null,
                'suggestion_origin' => $validated['suggestion_origin'] ?? null,
                'total_estimated_amount' => round($total, 2),
                'created_by_user_id' => $request->user()?->id ?? 1,
                'notes' => $validated['notes'] ?? null,
                'version' => 1,
            ]);

            foreach ($validated['lines'] as $l) {
                $lineTotal = ((int) $l['ordered_qty']) * ((float) $l['unit_price']);
                OrderLine::create([
                    'officine_id' => $officineId,
                    'purchase_order_id' => $order->id,
                    'product_id' => $l['product_id'],
                    'ordered_qty' => $l['ordered_qty'],
                    'received_qty' => 0,
                    'unit_price' => $l['unit_price'],
                    'line_total' => round($lineTotal, 2),
                ]);
            }

            return response()->json(['data' => $order->load('lines.product:id,code,name')], 201);
        });
    }

    public function approveOrder(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'stock.write');
        $officineId = $this->getOfficineId($request);

        $order = PurchaseOrder::where('officine_id', $officineId)->find($id);
        if (!$order) {
            return response()->json(['message' => 'Commande non trouvée.'], 404);
        }

        if (!in_array($order->status, ['brouillon', 'a_approuver'], true)) {
            return response()->json(['message' => 'Seule une commande en attente peut être approuvée/émise.'], 422);
        }

        $validated = $request->validate([
            'action' => 'sometimes|string|in:approuve,emis,annule',
        ]);
        $target = $validated['action'] ?? 'emis';

        $order->update([
            'status' => $target,
            'approved_by_user_id' => $request->user()?->id,
            'approved_at' => now(),
            'emitted_at' => $target === 'emis' ? now() : $order->emitted_at,
            'version' => $order->version + 1,
        ]);

        return response()->json(['data' => $order->load('lines.product:id,code,name')]);
    }

    // ==========================================
    // 3. RÉCEPTIONS PARTIELLES & IDEMPOTENTES (CDC 3.3 & 7)
    // ==========================================

    public function receiptsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'stock.read');
        $officineId = $this->getOfficineId($request);

        $receipts = Receipt::with(['supplier:id,code,name', 'purchaseOrder:id,reference', 'lines.product:id,code,name'])
            ->where('officine_id', $officineId)
            ->orderByDesc('received_at')
            ->get();

        return response()->json(['data' => $receipts]);
    }

    public function storeReceipt(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'stock.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'reference' => 'required|string|max:50',
            'idempotency_key' => 'nullable|string|max:100',
            'purchase_order_id' => 'nullable|integer',
            'supplier_id' => 'required|integer',
            'delivery_note_ref' => 'required|string|max:80',
            'parcel_count' => 'sometimes|integer|min:1',
            'has_thermosensitive_items' => 'sometimes|boolean',
            'arrival_temperature' => 'nullable|numeric|between:-50,60',
            'cold_chain_compliant' => 'nullable|boolean',
            'pharmacist_decision' => 'nullable|string|in:accepte,quarantaine,refuse',
            'reserves' => 'nullable|string',
            'lines' => 'required|array|min:1',
            'lines.*.order_line_id' => 'nullable|integer',
            'lines.*.product_id' => 'required|integer',
            'lines.*.batch_number' => 'required|string|max:80',
            'lines.*.expiry_date' => 'required|date',
            'lines.*.received_qty' => 'required|integer|min:1',
            'lines.*.accepted_qty' => 'sometimes|integer|min:0',
            'lines.*.rejected_qty' => 'sometimes|integer|min:0',
            'lines.*.unit_cost' => 'sometimes|numeric|min:0',
            'lines.*.storage_zone' => 'nullable|string|max:100',
        ]);

        // CDC 7 : Réception idempotente (double clic / rejeu sans doublon)
        if (!empty($validated['idempotency_key'])) {
            $replayed = Receipt::where('officine_id', $officineId)
                ->where('idempotency_key', $validated['idempotency_key'])
                ->first();
            if ($replayed) {
                return response()->json([
                    'data' => $replayed->load('lines.product:id,code,name'),
                    'replayed' => true,
                ], 200);
            }
        }

        if (Receipt::where('officine_id', $officineId)->where('reference', $validated['reference'])->exists()) {
            return response()->json(['message' => 'Cette référence de réception existe déjà.'], 422);
        }

        return DB::transaction(function () use ($validated, $officineId, $request) {
            $hasThermo = (bool) ($validated['has_thermosensitive_items'] ?? false);
            $coldCompliant = $validated['cold_chain_compliant'] ?? true;
            $decision = $validated['pharmacist_decision'] ?? ($coldCompliant ? 'accepte' : 'quarantaine');

            $createdActionId = null;
            if (($hasThermo && !$coldCompliant) || $decision === 'quarantaine' || $decision === 'refuse') {
                $action = QualityAction::create([
                    'officine_id' => $officineId,
                    'created_by' => $request->user()?->id ?? 1,
                    'title' => "Réception non conforme / Chaîne du froid BL {$validated['delivery_note_ref']}",
                    'chapter' => 'Approvisionnement & Stocks',
                    'severity' => 'high',
                    'owner' => $request->user()?->name ?? 'Pharmacien Titulaire',
                    'due_date' => now()->addDays(2)->toDateString(),
                    'status' => 'open',
                    'description' => "Réception {$validated['reference']} — Température arrivée : " . ($validated['arrival_temperature'] ?? 'N/A') . "°C. Décision : {$decision}. Réserves : " . ($validated['reserves'] ?? 'Aucune'),
                    'resolution' => '',
                ]);
                $createdActionId = $action->id;
            }

            $receiptStatus = $decision === 'refuse' ? 'refuse' : ($decision === 'quarantaine' ? 'quarantaine' : 'valide');

            $receipt = Receipt::create([
                'officine_id' => $officineId,
                'reference' => $validated['reference'],
                'idempotency_key' => $validated['idempotency_key'] ?? null,
                'purchase_order_id' => $validated['purchase_order_id'] ?? null,
                'supplier_id' => $validated['supplier_id'],
                'delivery_note_ref' => $validated['delivery_note_ref'],
                'parcel_count' => $validated['parcel_count'] ?? 1,
                'received_at' => now(),
                'received_by_user_id' => $request->user()?->id ?? 1,
                'has_thermosensitive_items' => $hasThermo,
                'arrival_temperature' => $validated['arrival_temperature'] ?? null,
                'cold_chain_compliant' => $hasThermo ? $coldCompliant : null,
                'pharmacist_decision' => $decision,
                'reserves' => $validated['reserves'] ?? null,
                'status' => $receiptStatus,
                'created_action_id' => $createdActionId,
                'version' => 1,
            ]);

            foreach ($validated['lines'] as $l) {
                $receivedQty = (int) $l['received_qty'];
                $acceptedQty = isset($l['accepted_qty']) ? (int) $l['accepted_qty'] : ($decision === 'refuse' ? 0 : $receivedQty);
                $rejectedQty = isset($l['rejected_qty']) ? (int) $l['rejected_qty'] : max(0, $receivedQty - $acceptedQty);
                $unitCost = (float) ($l['unit_cost'] ?? 0);

                $isQuarantine = ($decision === 'quarantaine') || ($hasThermo && !$coldCompliant);
                $lotStatus = $isQuarantine ? 'quarantaine' : 'disponible';
                $isSellable = !$isQuarantine && $acceptedQty > 0;

                $lotId = null;
                if ($acceptedQty > 0) {
                    $lot = Lot::where('officine_id', $officineId)
                        ->where('product_id', $l['product_id'])
                        ->where('batch_number', strtoupper($l['batch_number']))
                        ->lockForUpdate()
                        ->first();

                    if ($lot) {
                        $newBalance = $lot->available_qty + $acceptedQty;
                        $lot->update([
                            'available_qty' => $newBalance,
                            'status' => $isQuarantine ? 'quarantaine' : $lot->status,
                            'is_sellable' => $isQuarantine ? false : $lot->is_sellable,
                            'version' => $lot->version + 1,
                        ]);
                    } else {
                        $newBalance = $acceptedQty;
                        $lot = Lot::create([
                            'officine_id' => $officineId,
                            'product_id' => $l['product_id'],
                            'supplier_id' => $validated['supplier_id'],
                            'batch_number' => strtoupper($l['batch_number']),
                            'expiry_date' => $l['expiry_date'],
                            'storage_zone' => $l['storage_zone'] ?? ($hasThermo ? 'Enceinte 2-8°C' : 'Magasin / Réserve'),
                            'initial_qty' => $acceptedQty,
                            'available_qty' => $acceptedQty,
                            'unit_cost' => $unitCost,
                            'status' => $lotStatus,
                            'is_sellable' => $isSellable,
                            'version' => 1,
                        ]);
                    }
                    $lotId = $lot->id;

                    StockMovement::create([
                        'officine_id' => $officineId,
                        'product_id' => $l['product_id'],
                        'lot_id' => $lot->id,
                        'movement_type' => $isQuarantine ? 'quarantaine' : 'reception',
                        'quantity_delta' => $acceptedQty,
                        'balance_after' => $newBalance,
                        'reference_type' => 'receipt',
                        'reference_id' => $receipt->id,
                        'reason' => "Réception BL {$validated['delivery_note_ref']}" . ($isQuarantine ? ' (Quarantaine auto)' : ''),
                        'performed_by_user_id' => $request->user()?->id ?? 1,
                        'performed_at' => now(),
                    ]);

                    if ($isQuarantine) {
                        QuarantineEvent::create([
                            'officine_id' => $officineId,
                            'lot_id' => $lot->id,
                            'product_id' => $l['product_id'],
                            'event_type' => 'quarantaine',
                            'quantity' => $acceptedQty,
                            'reason' => "Mise en quarantaine automatique à la réception ({$validated['reference']}).",
                            'status' => 'ouvert',
                            'initiated_by_user_id' => $request->user()?->id ?? 1,
                            'created_action_id' => $createdActionId,
                            'version' => 1,
                        ]);
                    }
                }

                $orderedQty = 0;
                if (!empty($l['order_line_id'])) {
                    $ol = OrderLine::where('officine_id', $officineId)->find($l['order_line_id']);
                    if ($ol) {
                        $orderedQty = $ol->ordered_qty;
                        $ol->update(['received_qty' => $ol->received_qty + $acceptedQty]);
                    }
                }

                ReceiptLine::create([
                    'officine_id' => $officineId,
                    'receipt_id' => $receipt->id,
                    'order_line_id' => $l['order_line_id'] ?? null,
                    'product_id' => $l['product_id'],
                    'lot_id' => $lotId,
                    'batch_number' => strtoupper($l['batch_number']),
                    'expiry_date' => $l['expiry_date'],
                    'ordered_qty' => $orderedQty,
                    'received_qty' => $receivedQty,
                    'accepted_qty' => $acceptedQty,
                    'rejected_qty' => $rejectedQty,
                    'unit_cost' => $unitCost,
                    'conformity_status' => $decision === 'refuse' ? 'refuse' : ($isQuarantine ? 'quarantaine' : 'conforme'),
                ]);
            }

            // Mise à jour statut commande liée (partiel vs recu)
            if (!empty($validated['purchase_order_id'])) {
                $po = PurchaseOrder::with('lines')->where('officine_id', $officineId)->find($validated['purchase_order_id']);
                if ($po) {
                    $allReceived = $po->lines->every(fn ($ol) => $ol->received_qty >= $ol->ordered_qty);
                    $poStatus = $allReceived ? 'recu' : 'partiel';
                    $po->update(['status' => $poStatus, 'version' => $po->version + 1]);
                    if (!$allReceived && $receiptStatus === 'valide') {
                        $receipt->update(['status' => 'partiel']);
                    }
                }
            }

            return response()->json([
                'data' => $receipt->load('lines.product:id,code,name'),
                'replayed' => false,
            ], 201);
        });
    }

    // ==========================================
    // 4. LOTS FEFO, MOUVEMENTS & QUARANTAINE (CDC 3.4 & 3.5)
    // ==========================================

    public function lotsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'stock.read');
        $officineId = $this->getOfficineId($request);
        $today = Carbon::today()->toDateString();

        $query = Lot::with(['product:id,code,name,base_unit,is_thermosensitive', 'supplier:id,code,name'])
            ->where('officine_id', $officineId);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('product_id')) {
            $query->where('product_id', (int) $request->query('product_id'));
        }
        if (filter_var($request->query('fefo'), FILTER_VALIDATE_BOOLEAN)) {
            $query->where('is_sellable', true)
                ->where('status', 'disponible')
                ->where('available_qty', '>', 0)
                ->where('expiry_date', '>', $today)
                ->orderBy('expiry_date');
        } else {
            $query->orderBy('expiry_date');
        }

        if ($request->filled('expiring_days')) {
            $days = (int) $request->query('expiring_days');
            $query->where('available_qty', '>', 0)
                ->where('expiry_date', '<=', Carbon::today()->addDays($days)->toDateString());
        }

        return response()->json(['data' => $query->get()]);
    }

    public function movementsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'stock.read');
        $officineId = $this->getOfficineId($request);

        $movements = StockMovement::with(['product:id,code,name', 'lot:id,batch_number,expiry_date', 'performedBy:id,name'])
            ->where('officine_id', $officineId)
            ->orderByDesc('performed_at')
            ->orderByDesc('id')
            ->limit(200)
            ->get();

        return response()->json(['data' => $movements]);
    }

    /**
     * Enregistrer une sortie / mouvement traçable (empêche vente lot quarantaine ou stock négatif - CDC 7)
     */
    public function recordMovement(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'stock.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'lot_id' => 'required|integer',
            'movement_type' => 'required|string|in:vente,transfert,destruction,retour_fournisseur',
            'quantity' => 'required|integer|min:1',
            'reason' => 'required|string|max:500',
        ]);

        return DB::transaction(function () use ($validated, $officineId, $request) {
            $lot = Lot::where('officine_id', $officineId)
                ->where('id', $validated['lot_id'])
                ->lockForUpdate()
                ->first();

            if (!$lot) {
                return response()->json(['message' => 'Lot introuvable.'], 404);
            }

            if (in_array($validated['movement_type'], ['vente', 'transfert'], true)) {
                if (!$lot->is_sellable || $lot->status !== 'disponible') {
                    return response()->json(['message' => 'Lot bloqué (quarantaine, rappelé ou non vendable).'], 422);
                }
                if ($lot->expiry_date <= Carbon::today()->toDateString()) {
                    return response()->json(['message' => 'Lot périmé : sortie commerciale interdite (FEFO).'], 422);
                }
            }

            if ($lot->available_qty < $validated['quantity']) {
                return response()->json(['message' => 'Stock insuffisant sur ce lot (stock négatif interdit).'], 422);
            }

            $newBalance = $lot->available_qty - $validated['quantity'];
            $newStatus = $newBalance === 0 && $validated['movement_type'] === 'destruction' ? 'detruit' : ($newBalance === 0 ? 'epuise' : $lot->status);

            $lot->update([
                'available_qty' => $newBalance,
                'status' => $newStatus,
                'version' => $lot->version + 1,
            ]);

            $movement = StockMovement::create([
                'officine_id' => $officineId,
                'product_id' => $lot->product_id,
                'lot_id' => $lot->id,
                'movement_type' => $validated['movement_type'],
                'quantity_delta' => -$validated['quantity'],
                'balance_after' => $newBalance,
                'reason' => $validated['reason'],
                'performed_by_user_id' => $request->user()?->id ?? 1,
                'performed_at' => now(),
            ]);

            return response()->json(['data' => $movement->load('lot:id,batch_number,available_qty,status')], 201);
        });
    }

    public function quarantineAction(Request $request, int $lotId): JsonResponse
    {
        $this->checkPermission($request, 'stock.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'event_type' => 'required|string|in:quarantaine,rappel,levee_quarantaine,retour_fournisseur,destruction',
            'reason' => 'required|string',
            'proof_reference' => 'required_if:event_type,destruction,retour_fournisseur|nullable|string|max:150',
        ]);

        return DB::transaction(function () use ($validated, $officineId, $lotId, $request) {
            $lot = Lot::where('officine_id', $officineId)->where('id', $lotId)->lockForUpdate()->first();
            if (!$lot) {
                return response()->json(['message' => 'Lot introuvable.'], 404);
            }

            $type = $validated['event_type'];

            if ($type === 'levee_quarantaine') {
                if ($lot->status !== 'quarantaine') {
                    return response()->json(['message' => 'Seul un lot en quarantaine peut être libéré (un lot rappelé ne peut être libéré).'], 422);
                }
                if ($lot->expiry_date <= Carbon::today()->toDateString()) {
                    return response()->json(['message' => 'Impossible de libérer un lot périmé.'], 422);
                }
            }

            $createdActionId = null;
            if (in_array($type, ['quarantaine', 'rappel'], true)) {
                $action = QualityAction::create([
                    'officine_id' => $officineId,
                    'created_by' => $request->user()?->id ?? 1,
                    'title' => strtoupper($type) . " lot {$lot->batch_number}",
                    'chapter' => 'Approvisionnement & Stocks',
                    'severity' => $type === 'rappel' ? 'critical' : 'high',
                    'owner' => $request->user()?->name ?? 'Pharmacien Titulaire',
                    'due_date' => now()->addDays(2)->toDateString(),
                    'status' => 'open',
                    'description' => $validated['reason'],
                    'resolution' => '',
                ]);
                $createdActionId = $action->id;
            }

            $qtyBefore = $lot->available_qty;
            $delta = 0;

            if (in_array($type, ['quarantaine', 'rappel'], true)) {
                $lot->update([
                    'status' => $type === 'rappel' ? 'rappele' : 'quarantaine',
                    'is_sellable' => false,
                    'version' => $lot->version + 1,
                ]);
            } elseif ($type === 'levee_quarantaine') {
                $lot->update([
                    'status' => 'disponible',
                    'is_sellable' => true,
                    'version' => $lot->version + 1,
                ]);
            } elseif (in_array($type, ['retour_fournisseur', 'destruction'], true)) {
                $delta = -$qtyBefore;
                $lot->update([
                    'available_qty' => 0,
                    'status' => $type === 'destruction' ? 'detruit' : 'epuise',
                    'is_sellable' => false,
                    'version' => $lot->version + 1,
                ]);
            }

            $event = QuarantineEvent::create([
                'officine_id' => $officineId,
                'lot_id' => $lot->id,
                'product_id' => $lot->product_id,
                'event_type' => $type,
                'quantity' => $qtyBefore,
                'reason' => $validated['reason'],
                'proof_reference' => $validated['proof_reference'] ?? null,
                'status' => 'valide',
                'initiated_by_user_id' => $request->user()?->id ?? 1,
                'validated_by_user_id' => $request->user()?->id,
                'validated_at' => now(),
                'created_action_id' => $createdActionId,
                'version' => 1,
            ]);

            StockMovement::create([
                'officine_id' => $officineId,
                'product_id' => $lot->product_id,
                'lot_id' => $lot->id,
                'movement_type' => $type === 'levee_quarantaine' ? 'liberation' : $type,
                'quantity_delta' => $delta,
                'balance_after' => $lot->available_qty,
                'reference_type' => 'quarantine_event',
                'reference_id' => $event->id,
                'reason' => $validated['reason'],
                'performed_by_user_id' => $request->user()?->id ?? 1,
                'performed_at' => now(),
            ]);

            return response()->json(['data' => $event->load('lot:id,batch_number,status,is_sellable,available_qty')], 201);
        });
    }

    // ==========================================
    // 5. INVENTAIRES PHYSIQUES & ÉCARTS (CDC 3.4)
    // ==========================================

    public function inventoriesIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'stock.read');
        $officineId = $this->getOfficineId($request);

        $inventories = Inventory::with(['lines.product:id,code,name', 'lines.lot:id,batch_number', 'approvedBy:id,name'])
            ->where('officine_id', $officineId)
            ->orderByDesc('inventory_date')
            ->get();

        return response()->json(['data' => $inventories]);
    }

    public function storeInventory(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'stock.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'reference' => 'required|string|max:50',
            'inventory_date' => 'required|date',
            'scope_description' => 'sometimes|string|max:180',
            'lines' => 'required|array|min:1',
            'lines.*.lot_id' => 'required|integer',
            'lines.*.counted_qty' => 'required|integer|min:0',
            'lines.*.justification' => 'nullable|string',
        ]);

        if (Inventory::where('officine_id', $officineId)->where('reference', $validated['reference'])->exists()) {
            return response()->json(['message' => 'Cette référence d’inventaire existe déjà.'], 422);
        }

        return DB::transaction(function () use ($validated, $officineId, $request) {
            $totalVariance = 0;

            $inventory = Inventory::create([
                'officine_id' => $officineId,
                'reference' => $validated['reference'],
                'inventory_date' => $validated['inventory_date'],
                'scope_description' => $validated['scope_description'] ?? 'Inventaire général',
                'status' => 'compte',
                'created_by_user_id' => $request->user()?->id ?? 1,
                'total_variance_qty' => 0,
                'version' => 1,
            ]);

            foreach ($validated['lines'] as $l) {
                $lot = Lot::where('officine_id', $officineId)->find($l['lot_id']);
                if (!$lot) {
                    abort(404, "Lot #{$l['lot_id']} introuvable.");
                }
                $variance = ((int) $l['counted_qty']) - $lot->available_qty;
                $totalVariance += $variance;

                InventoryLine::create([
                    'officine_id' => $officineId,
                    'inventory_id' => $inventory->id,
                    'product_id' => $lot->product_id,
                    'lot_id' => $lot->id,
                    'theoretical_qty' => $lot->available_qty,
                    'counted_qty' => $l['counted_qty'],
                    'variance_qty' => $variance,
                    'justification' => $l['justification'] ?? null,
                ]);
            }

            $inventory->update(['total_variance_qty' => $totalVariance]);
            return response()->json(['data' => $inventory->load('lines.lot:id,batch_number')], 201);
        });
    }

    public function approveInventory(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'stock.write');
        $officineId = $this->getOfficineId($request);

        return DB::transaction(function () use ($officineId, $id, $request) {
            $inventory = Inventory::with('lines')->where('officine_id', $officineId)->lockForUpdate()->find($id);
            if (!$inventory) {
                return response()->json(['message' => 'Inventaire non trouvé.'], 404);
            }
            if ($inventory->status !== 'compte') {
                return response()->json(['message' => 'Cet inventaire a déjà été approuvé ou annulé.'], 422);
            }

            foreach ($inventory->lines as $line) {
                if ($line->variance_qty === 0) {
                    continue;
                }
                $lot = Lot::where('officine_id', $officineId)->lockForUpdate()->find($line->lot_id);
                if (!$lot) {
                    continue;
                }

                $lot->update([
                    'available_qty' => $line->counted_qty,
                    'version' => $lot->version + 1,
                ]);

                StockMovement::create([
                    'officine_id' => $officineId,
                    'product_id' => $lot->product_id,
                    'lot_id' => $lot->id,
                    'movement_type' => $line->variance_qty > 0 ? 'inventaire_plus' : 'inventaire_moins',
                    'quantity_delta' => $line->variance_qty,
                    'balance_after' => $line->counted_qty,
                    'reference_type' => 'inventory',
                    'reference_id' => $inventory->id,
                    'reason' => "Ajustement inventaire {$inventory->reference}" . ($line->justification ? " : {$line->justification}" : ''),
                    'performed_by_user_id' => $request->user()?->id ?? 1,
                    'performed_at' => now(),
                ]);
            }

            $inventory->update([
                'status' => 'approuve',
                'approved_by_user_id' => $request->user()?->id,
                'approved_at' => now(),
                'version' => $inventory->version + 1,
            ]);

            return response()->json(['data' => $inventory->load('lines.lot:id,batch_number,available_qty')]);
        });
    }

    // ==========================================
    // 6. CHAÎNE DU FROID PAR ÉQUIPEMENT (CDC 3.6)
    // ==========================================

    public function temperaturesIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'stock.read');
        $officineId = $this->getOfficineId($request);

        $readings = TemperatureReading::with(['equipment:id,code,designation', 'recordedBy:id,name'])
            ->where('officine_id', $officineId)
            ->orderByDesc('measured_at')
            ->get();

        return response()->json(['data' => $readings]);
    }

    public function storeTemperature(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'stock.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'equipment_id' => 'nullable|integer',
            'zone_name' => 'required|string|max:120',
            'measured_temperature' => 'required|numeric|between:-50,80',
            'min_threshold' => 'sometimes|numeric',
            'max_threshold' => 'sometimes|numeric',
            'measured_at' => 'sometimes|date',
            'incident_notes' => 'nullable|string',
        ]);

        $min = (float) ($validated['min_threshold'] ?? 2.0);
        $max = (float) ($validated['max_threshold'] ?? 8.0);
        $temp = (float) $validated['measured_temperature'];
        $isExcursion = ($temp < $min || $temp > $max);

        return DB::transaction(function () use ($validated, $officineId, $min, $max, $temp, $isExcursion, $request) {
            $createdActionId = null;
            if ($isExcursion) {
                $action = QualityAction::create([
                    'officine_id' => $officineId,
                    'created_by' => $request->user()?->id ?? 1,
                    'title' => "Excursion chaîne du froid {$validated['zone_name']} ({$temp}°C)",
                    'chapter' => 'Chaîne du Froid & Stockage',
                    'severity' => 'critical',
                    'owner' => $request->user()?->name ?? 'Pharmacien Titulaire',
                    'due_date' => now()->addDay()->toDateString(),
                    'status' => 'open',
                    'description' => "Température mesurée : {$temp}°C (seuils configurés : {$min}°C à {$max}°C). Notes : " . ($validated['incident_notes'] ?? 'Aucune'),
                    'resolution' => '',
                ]);
                $createdActionId = $action->id;
            }

            $reading = TemperatureReading::create([
                'officine_id' => $officineId,
                'equipment_id' => $validated['equipment_id'] ?? null,
                'zone_name' => $validated['zone_name'],
                'measured_temperature' => $temp,
                'min_threshold' => $min,
                'max_threshold' => $max,
                'is_excursion' => $isExcursion,
                'measured_at' => $validated['measured_at'] ?? now(),
                'recorded_by_user_id' => $request->user()?->id ?? 1,
                'incident_notes' => $validated['incident_notes'] ?? null,
                'effectiveness_status' => $isExcursion ? 'incident_ouvert' : 'conforme',
                'created_action_id' => $createdActionId,
                'version' => 1,
            ]);

            return response()->json(['data' => $reading], 201);
        });
    }

    public function decideTemperature(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'stock.write');
        $officineId = $this->getOfficineId($request);

        $reading = TemperatureReading::where('officine_id', $officineId)->find($id);
        if (!$reading) {
            return response()->json(['message' => 'Relevé introuvable.'], 404);
        }

        $validated = $request->validate([
            'pharmacist_decision' => 'required|string',
            'effectiveness_status' => 'required|string|in:a_surveiller,resolu',
        ]);

        $reading->update([
            'pharmacist_decision' => $validated['pharmacist_decision'],
            'effectiveness_status' => $validated['effectiveness_status'],
            'version' => $reading->version + 1,
        ]);

        return response()->json(['data' => $reading]);
    }
}

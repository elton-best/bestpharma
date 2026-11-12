<?php

declare(strict_types=1);

namespace App\Modules\Fiscalite\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Dispensation\Models\Sale;
use App\Modules\Fiscalite\Models\FeexPayIntent;
use App\Modules\Fiscalite\Models\FiscalInvoice;
use App\Modules\Fiscalite\Services\FeexPayService;
use App\Modules\Fiscalite\Services\MecefService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FiscaliteController extends Controller
{
    public function __construct(
        private readonly MecefService $mecef,
        private readonly FeexPayService $feexpay
    ) {
    }

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
        if (!in_array($permission, $perms, true) && !in_array('*', $perms, true)) {
            abort(403, 'Permission insuffisante pour cette action.');
        }
    }

    public function overview(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'fiscalite.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'kpis' => [
                'invoices_total' => FiscalInvoice::where('officine_id', $officineId)->count(),
                'invoices_certified' => FiscalInvoice::where('officine_id', $officineId)->where('status', 'certifiee')->count(),
                'feexpay_intents_total' => FeexPayIntent::where('officine_id', $officineId)->count(),
                'feexpay_confirmed_amount' => round((float) FeexPayIntent::where('officine_id', $officineId)->where('status', 'confirme')->sum('amount'), 2),
            ],
            'connectors' => [
                'mecef' => $this->mecef->statusSummary(),
                'feexpay' => $this->feexpay->statusSummary(),
            ],
        ]);
    }

    // ==========================================
    // 1. FACTURES NORMALISÉES DGI / e-MECEF
    // ==========================================

    public function invoicesIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'fiscalite.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => FiscalInvoice::where('officine_id', $officineId)->orderByDesc('id')->get(),
        ]);
    }

    public function storeInvoice(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'fiscalite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'sale_id' => 'nullable|integer',
            'reference' => 'required|string|max:60',
            'invoice_type' => 'sometimes|string|in:FV,FA',
            'customer_ifu' => 'nullable|string|max:20',
            'customer_name' => 'sometimes|string|max:150',
            'total_ht' => 'required|numeric|min:0',
            'total_tva' => 'required|numeric|min:0',
            'total_ttc' => 'required|numeric|min:0',
            'idempotency_key' => 'nullable|string|max:120',
        ]);

        if (!empty($validated['idempotency_key'])) {
            $replayed = FiscalInvoice::where('officine_id', $officineId)
                ->where('idempotency_key', $validated['idempotency_key'])
                ->first();
            if ($replayed) {
                return response()->json(['data' => $replayed, 'replayed' => true], 200);
            }
        }

        if (FiscalInvoice::where('officine_id', $officineId)->where('reference', $validated['reference'])->exists()) {
            return response()->json(['message' => 'Cette référence de facture fiscale existe déjà.'], 422);
        }

        if (!empty($validated['sale_id']) && !Sale::where('officine_id', $officineId)->where('id', $validated['sale_id'])->exists()) {
            return response()->json(['message' => 'Vente introuvable dans cette officine.'], 404);
        }

        $invoice = FiscalInvoice::create([
            'officine_id' => $officineId,
            'sale_id' => $validated['sale_id'] ?? null,
            'reference' => $validated['reference'],
            'invoice_type' => $validated['invoice_type'] ?? 'FV',
            'customer_ifu' => $validated['customer_ifu'] ?? null,
            'customer_name' => $validated['customer_name'] ?? 'Client Comptoir',
            'total_ht' => $validated['total_ht'],
            'total_tva' => $validated['total_tva'],
            'total_ttc' => $validated['total_ttc'],
            'status' => 'brouillon',
            'idempotency_key' => $validated['idempotency_key'] ?? null,
            'version' => 1,
        ]);

        return response()->json(['data' => $invoice], 201);
    }

    public function certifyInvoice(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'fiscalite.write');
        $officineId = $this->getOfficineId($request);

        $invoice = FiscalInvoice::where('officine_id', $officineId)->find($id);
        if (!$invoice) {
            return response()->json(['message' => 'Facture fiscale introuvable.'], 404);
        }

        $certified = $this->mecef->certifyInvoice($invoice);

        return response()->json(['data' => $certified]);
    }

    // ==========================================
    // 2. PAIEMENTS MOBILE MONEY FEEXPAY & WEBHOOK
    // ==========================================

    public function feexpayIntentsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'fiscalite.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => FeexPayIntent::where('officine_id', $officineId)->orderByDesc('id')->get(),
        ]);
    }

    public function initiateFeexPay(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'fiscalite.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'sale_id' => 'nullable|integer',
            'reference' => 'required|string|max:60',
            'amount' => 'required|numeric|min:100',
            'currency' => 'sometimes|string|max:10',
            'network' => 'required|string|in:MTN,MOOV,CELTIIS,CARTE',
            'phone_number' => 'nullable|string|max:30',
            'idempotency_key' => 'nullable|string|max:120',
        ]);

        if (!empty($validated['idempotency_key'])) {
            $replayed = FeexPayIntent::where('officine_id', $officineId)
                ->where('idempotency_key', $validated['idempotency_key'])
                ->first();
            if ($replayed) {
                return response()->json(['data' => $replayed, 'replayed' => true], 200);
            }
        }

        if (FeexPayIntent::where('officine_id', $officineId)->where('reference', $validated['reference'])->exists()) {
            return response()->json(['message' => 'Cette référence de paiement existe déjà.'], 422);
        }

        if (!empty($validated['sale_id']) && !Sale::where('officine_id', $officineId)->where('id', $validated['sale_id'])->exists()) {
            return response()->json(['message' => 'Vente introuvable dans cette officine.'], 404);
        }

        $intent = FeexPayIntent::create([
            'officine_id' => $officineId,
            'sale_id' => $validated['sale_id'] ?? null,
            'reference' => $validated['reference'],
            'amount' => $validated['amount'],
            'currency' => $validated['currency'] ?? 'XOF',
            'network' => $validated['network'],
            'phone_number' => $validated['phone_number'] ?? null,
            'status' => 'initie',
            'idempotency_key' => $validated['idempotency_key'] ?? null,
            'version' => 1,
        ]);

        $initiated = $this->feexpay->initiatePayment($intent);

        return response()->json(['data' => $initiated], 201);
    }

    public function feexpayWebhook(Request $request): JsonResponse
    {
        $secret = (string) config('services.feexpay.api_key');
        $providedSig = (string) $request->header('X-FeexPay-Signature', '');
        $expectedSig = $secret !== '' ? hash_hmac('sha256', (string) $request->getContent(), $secret) : '';

        if ($secret === '' || $providedSig === '' || !hash_equals($expectedSig, $providedSig)) {
            return response()->json(['message' => 'Signature webhook FeexPay invalide.'], 403);
        }

        $validated = $request->validate([
            'officine_id' => 'required|integer',
            'reference' => 'required|string|max:60',
            'provider_reference' => 'nullable|string|max:120',
            'status' => 'required|string|in:SUCCESSFUL,FAILED',
        ]);

        return DB::transaction(function () use ($validated) {
            $intent = FeexPayIntent::where('officine_id', $validated['officine_id'])
                ->where('reference', $validated['reference'])
                ->lockForUpdate()
                ->first();

            if (!$intent) {
                return response()->json(['message' => 'Transaction FeexPay introuvable.'], 404);
            }

            if ($intent->status === 'confirme') {
                return response()->json(['data' => $intent, 'replayed' => true], 200);
            }

            $newStatus = $validated['status'] === 'SUCCESSFUL' ? 'confirme' : 'echoue';
            $intent->update([
                'status' => $newStatus,
                'provider_reference' => $validated['provider_reference'] ?? $intent->provider_reference,
                'callback_payload' => $validated,
                'confirmed_at' => $newStatus === 'confirme' ? now() : null,
                'version' => $intent->version + 1,
            ]);

            return response()->json(['data' => $intent, 'replayed' => false], 200);
        });
    }
}

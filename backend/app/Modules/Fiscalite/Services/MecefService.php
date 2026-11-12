<?php

declare(strict_types=1);

namespace App\Modules\Fiscalite\Services;

use App\Modules\Fiscalite\Models\FiscalInvoice;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class MecefService
{
    public function isConfigured(): bool
    {
        return filled(config('services.mecef.token')) && filled(config('services.mecef.ifu'));
    }

    public function statusSummary(): array
    {
        return [
            'configured' => $this->isConfigured(),
            'mode' => (string) config('services.mecef.mode', 'test'),
            'has_token' => filled(config('services.mecef.token')),
            'has_ifu' => filled(config('services.mecef.ifu')),
        ];
    }

    public function certifyInvoice(FiscalInvoice $invoice): FiscalInvoice
    {
        if (!$this->isConfigured()) {
            throw ValidationException::withMessages([
                'mecef' => ['Connecteur e-MECEF non configuré : renseignez MECEF_TOKEN et MECEF_IFU.'],
            ]);
        }

        if ($invoice->status === 'certifiee' && filled($invoice->mecef_code)) {
            return $invoice;
        }

        $token = (string) config('services.mecef.token');
        $ifu = (string) config('services.mecef.ifu');
        $url = (string) config('services.mecef.invoice_url');

        $payload = [
            'ifu' => $ifu,
            'type' => $invoice->invoice_type,
            'reference' => $invoice->reference,
            'client' => [
                'ifu' => $invoice->customer_ifu,
                'name' => $invoice->customer_name,
            ],
            'totalHT' => $invoice->total_ht,
            'totalTVA' => $invoice->total_tva,
            'totalTTC' => $invoice->total_ttc,
        ];

        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout(15)
            ->post($url, $payload);

        if (!$response->successful()) {
            $invoice->update([
                'status' => 'erreur',
                'version' => $invoice->version + 1,
            ]);
            throw ValidationException::withMessages([
                'mecef' => ['Échec certification DGI/e-MECEF (' . $response->status() . ').'],
            ]);
        }

        $data = $response->json() ?? [];
        $codeMecef = $data['codeMECeFDGI'] ?? $data['mecef_code'] ?? null;
        $qrCode = $data['qrCode'] ?? $data['qr_code'] ?? null;
        $uid = $data['uid'] ?? $data['nim'] ?? null;

        if (!filled($codeMecef) || !filled($qrCode)) {
            $invoice->update([
                'status' => 'erreur',
                'version' => $invoice->version + 1,
            ]);
            throw ValidationException::withMessages([
                'mecef' => ['Réponse e-MECEF incomplète : codeMECeFDGI ou qrCode manquant.'],
            ]);
        }

        $invoice->update([
            'status' => 'certifiee',
            'mecef_uid' => $uid,
            'mecef_code' => $codeMecef,
            'mecef_qr_data' => $qrCode,
            'mecef_counters' => $data['counters'] ?? null,
            'certified_at' => now(),
            'version' => $invoice->version + 1,
        ]);

        return $invoice->fresh();
    }
}

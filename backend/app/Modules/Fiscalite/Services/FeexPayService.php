<?php

declare(strict_types=1);

namespace App\Modules\Fiscalite\Services;

use App\Modules\Fiscalite\Models\FeexPayIntent;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class FeexPayService
{
    public function isConfigured(): bool
    {
        return filled(config('services.feexpay.shop_id')) && filled(config('services.feexpay.api_key'));
    }

    public function statusSummary(): array
    {
        return [
            'configured' => $this->isConfigured(),
            'mode' => (string) config('services.feexpay.mode', 'SANDBOX'),
            'has_shop_id' => filled(config('services.feexpay.shop_id')),
            'has_api_key' => filled(config('services.feexpay.api_key')),
        ];
    }

    public function initiatePayment(FeexPayIntent $intent): FeexPayIntent
    {
        if (!$this->isConfigured()) {
            throw ValidationException::withMessages([
                'feexpay' => ['Connecteur FeexPay non configuré : renseignez FEEXPAY_SHOP_ID et FEEXPAY_API_KEY.'],
            ]);
        }

        $baseUrl = rtrim((string) config('services.feexpay.base_url'), '/');
        $apiKey = (string) config('services.feexpay.api_key');
        $shopId = (string) config('services.feexpay.shop_id');

        $response = Http::withToken($apiKey)
            ->acceptJson()
            ->timeout(15)
            ->post("{$baseUrl}/api/transactions/public/requesttopay", [
                'shop' => $shopId,
                'amount' => $intent->amount,
                'currency' => $intent->currency,
                'network' => $intent->network,
                'phoneNumber' => $intent->phone_number,
                'customId' => $intent->reference,
                'callbackUrl' => config('services.feexpay.callback_url'),
            ]);

        if (!$response->successful()) {
            $intent->update([
                'status' => 'echoue',
                'version' => $intent->version + 1,
            ]);
            throw ValidationException::withMessages([
                'feexpay' => ['Échec initialisation FeexPay (' . $response->status() . ').'],
            ]);
        }

        $data = $response->json() ?? [];
        $providerRef = $data['reference'] ?? $data['transaction_id'] ?? $intent->reference;

        $intent->update([
            'status' => 'en_attente',
            'provider_reference' => (string) $providerRef,
            'version' => $intent->version + 1,
        ]);

        return $intent->fresh();
    }
}

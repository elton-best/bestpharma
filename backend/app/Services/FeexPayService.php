<?php

namespace App\Services;

use App\Models\PaiementFeexPay;
use App\Models\VenteCaisse;
use Carbon\Carbon;
use Illuminate\Support\Str;

class FeexPayService
{
    /**
     * Initialisation d'une demande de paiement mobile (MTN MoMo, Moov Money, Celtiis Cash)
     */
    public function initierPaiement(VenteCaisse $vente, string $operateur, string $telephone): PaiementFeexPay
    {
        $reference = 'FP-' . strtoupper(Str::random(10)) . '-' . Carbon::now()->format('His');

        // Simulation de la passerelle FeexPay API (environnement sandbox / production)
        $txOperateur = strtoupper($operateur) . '-TX-' . rand(100000, 999999);

        return PaiementFeexPay::create([
            'officine_id' => $vente->officine_id,
            'vente_id' => $vente->id,
            'reference_feexpay' => $reference,
            'operateur' => $operateur,
            'telephone_payeur' => $telephone,
            'montant' => $vente->montant_net_ttc,
            'statut' => 'successful', // Validé immédiatement en démo / environnement connecté
            'transaction_id_operateur' => $txOperateur,
            'payload_reponse' => [
                'status' => 'SUCCESSFUL',
                'feexpay_reference' => $reference,
                'operator' => strtoupper($operateur),
                'amount' => (float) $vente->montant_net_ttc,
                'currency' => 'XOF',
                'phone' => $telephone,
                'timestamp' => Carbon::now()->toIso8601String(),
            ],
        ]);
    }
}

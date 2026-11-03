<?php

namespace App\Services;

use App\Models\EcritureSyscohada;
use App\Models\VenteCaisse;
use Carbon\Carbon;

class SyscohadaService
{
    /**
     * Génère automatiquement les écritures de vente selon le plan comptable SYSCOHADA révisé :
     * - Débit : Compte de trésorerie (5311 Caisse ou 5121 Banques/Mobile Money)
     * - Crédit : Compte 7011 Vente de marchandises (Médicaments)
     * - Crédit : Compte 4431 TVA facturée sur ventes (si articles taxables Groupe B)
     */
    public function genererEcrituresVente(VenteCaisse $vente): void
    {
        $date = Carbon::now()->format('Y-m-d');
        $piece = $vente->numero_ticket;
        $officineId = $vente->officine_id;

        // 1. Débit Trésorerie
        $compteTresorerie = $vente->mode_reglement === 'especes' ? '5311' : '5121';
        $libelleTresorerie = $vente->mode_reglement === 'especes' ? 'Caisse principale' : 'Comptes Mobile Money / Banque';

        EcritureSyscohada::create([
            'officine_id' => $officineId,
            'vente_id' => $vente->id,
            'date_piece' => $date,
            'numero_piece' => $piece,
            'numero_compte' => $compteTresorerie,
            'libelle_compte' => $libelleTresorerie,
            'libelle_ecriture' => "Règlement vente comptoir {$piece} ({$vente->client_nom})",
            'debit' => $vente->montant_net_ttc,
            'credit' => 0,
            'journal_code' => 'VT',
        ]);

        // 2. Crédit Ventes Médicaments (HT)
        EcritureSyscohada::create([
            'officine_id' => $officineId,
            'vente_id' => $vente->id,
            'date_piece' => $date,
            'numero_piece' => $piece,
            'numero_compte' => '7011',
            'libelle_compte' => 'Ventes de marchandises dans la Région (Médicaments)',
            'libelle_ecriture' => "Chiffre d'affaires vente {$piece}",
            'debit' => 0,
            'credit' => $vente->montant_brut_ht,
            'journal_code' => 'VT',
        ]);

        // 3. Crédit TVA Facturée (si applicable)
        if ($vente->montant_tva > 0) {
            EcritureSyscohada::create([
                'officine_id' => $officineId,
                'vente_id' => $vente->id,
                'date_piece' => $date,
                'numero_piece' => $piece,
                'numero_compte' => '4431',
                'libelle_compte' => 'État, TVA facturée sur ventes',
                'libelle_ecriture' => "TVA 18% collectée sur vente {$piece}",
                'debit' => 0,
                'credit' => $vente->montant_tva,
                'journal_code' => 'VT',
            ]);
        }
    }
}

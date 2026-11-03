<?php

namespace Tests\Feature;

use App\Models\Officine;
use App\Models\Produit;
use App\Models\SessionCaisse;
use App\Models\StockLot;
use App\Models\User;
use App\Models\UtilisateurOfficine;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class Partie4PosFeexPayEmecefTest extends TestCase
{
    use DatabaseTransactions;

    protected Officine $officine;
    protected User $caissier;
    protected Produit $produit;
    protected StockLot $lot;

    protected function setUp(): void
    {
        parent::setUp();

        $uid = Str::random(6);
        $this->officine = Officine::create([
            'id' => (string) Str::uuid(),
            'nom' => "Pharmacie Concorde {$uid}",
            'raison_sociale' => "Pharmacie Concorde {$uid} SARL",
            'numero_licence' => "LIC-BJ-POS-{$uid}",
            'email' => "concorde_{$uid}@bestpharma.bj",
            'telephone' => '+229 97 55 66 77',
            'adresse' => 'Haie Vive, Cotonou',
        ]);

        $this->caissier = User::create([
            'id' => (string) Str::uuid(),
            'name' => 'Edwige Dossou',
            'email' => "edwige_{$uid}@bestpharma.bj",
            'password' => bcrypt('Password123!'),
            'telephone' => '+229 97 12 34 56',
            'actif' => true,
        ]);

        UtilisateurOfficine::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officine->id,
            'user_id' => $this->caissier->id,
            'role_code' => 'caissier',
            'actif' => true,
        ]);

        $this->produit = Produit::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officine->id,
            'code_cip' => "CIP-POS-{$uid}",
            'nom_commercial' => 'Paracétamol Biogaran 500mg',
            'dci' => 'Paracétamol',
            'tableau_substance' => 'sans',
            'prix_public_ttc' => 1000,
        ]);

        $this->lot = StockLot::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officine->id,
            'produit_id' => $this->produit->id,
            'numero_lot' => "LOT-POS-{$uid}",
            'date_peremption' => Carbon::now()->addMonths(12),
            'quantite_initiale' => 50,
            'quantite_disponible' => 50,
            'statut' => 'en_stock',
        ]);
    }

    public function test_ouverture_et_cloture_caisse(): void
    {
        $token = $this->caissier->createToken('test')->plainTextToken;

        // 1. Ouvrir caisse avec 25 000 FCFA de fond
        $ouvrirResp = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/caisse/ouvrir', [
                'fond_caisse_ouverture' => 25000,
            ]);

        $ouvrirResp->assertStatus(201);
        $sessionId = $ouvrirResp->json('data.id');
        $this->assertEquals(25000, $ouvrirResp->json('data.fond_caisse_ouverture'));
        $this->assertEquals('ouverte', $ouvrirResp->json('data.statut'));

        // 2. Ticket X intermédiaire
        $ticketXResp = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/caisse/session/{$sessionId}/ticket-x");

        $ticketXResp->assertStatus(200);
        $this->assertEquals(25000, $ticketXResp->json('data.especes_theoriques'));

        // 3. Clôture Ticket Z avec décompte réel (25 000 FCFA -> écart 0)
        $fermerResp = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/caisse/session/{$sessionId}/fermer", [
                'fond_caisse_fermeture_reel' => 25000,
                'notes_cloture' => 'Clôture normale sans écart',
            ]);

        $fermerResp->assertStatus(200);
        $this->assertEquals('fermee', $fermerResp->json('data.statut'));
        $this->assertEquals(0, $fermerResp->json('data.ecart_caisse'));
    }

    public function test_vente_pos_fefo_et_certification_emecef_dgi(): void
    {
        $token = $this->caissier->createToken('test')->plainTextToken;

        // Ouvrir caisse
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/caisse/ouvrir', [
                'fond_caisse_ouverture' => 10000,
            ])->assertStatus(201);

        // Encaisser une vente de 2 boîtes en espèces (2 000 FCFA)
        $venteResp = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/caisse/ventes', [
                'client_nom' => 'M. Florentin Houndété',
                'client_ifu' => '0202611889900',
                'mode_reglement' => 'especes',
                'montant_recu' => 5000,
                'lignes' => [
                    [
                        'produit_id' => $this->produit->id,
                        'quantite' => 2,
                    ],
                ],
            ]);

        $venteResp->assertStatus(201);

        // 1. Vérifier la vente
        $this->assertEquals(2000, $venteResp->json('data.montant_net_ttc'));
        $this->assertEquals(3000, $venteResp->json('data.monnaie_rendue'));

        // 2. Vérifier la décrémentation FEFO du lot
        $this->lot->refresh();
        $this->assertEquals(48, $this->lot->quantite_disponible);

        // 3. Vérifier la certification DGI e-MECeF
        $factureDgi = $venteResp->json('data.facture_emecef');
        $this->assertNotNull($factureDgi);
        $this->assertStringContainsString('FV', $factureDgi['numero_facture_dgi']);
        $this->assertNotNull($factureDgi['code_mecef']);
        $this->assertNotNull($factureDgi['qr_code_data']);
        $this->assertEquals('certifiee', $factureDgi['statut']);

        // 4. Vérifier les écritures comptables SYSCOHADA (Débit 5311 / Crédit 7011)
        $journalResp = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/comptabilite/journal-ventes');

        $journalResp->assertStatus(200);
        $this->assertNotEmpty($journalResp->json('data.data'));
    }

    public function test_vente_mobile_money_feexpay(): void
    {
        $token = $this->caissier->createToken('test')->plainTextToken;

        // Vente avec paiement Mobile Money FeexPay (MTN Bénin)
        $venteResp = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/caisse/ventes', [
                'client_nom' => 'Mme Sophie Adanho',
                'mode_reglement' => 'mobile_money',
                'mobile_operateur' => 'mtn',
                'mobile_telephone' => '22997112233',
                'lignes' => [
                    [
                        'produit_id' => $this->produit->id,
                        'quantite' => 1,
                    ],
                ],
            ]);

        $venteResp->assertStatus(201);
        $paiementFp = $venteResp->json('data.paiement_feex_pay');
        $this->assertNotNull($paiementFp);
        $this->assertEquals('mtn', $paiementFp['operateur']);
        $this->assertEquals('successful', $paiementFp['statut']);
        $this->assertEquals(1000, $paiementFp['montant']);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Officine;
use App\Models\Produit;
use App\Models\StockLot;
use App\Models\User;
use App\Models\UtilisateurOfficine;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class Jalon4ConsolidationGardesTest extends TestCase
{
    use DatabaseTransactions;

    public function test_promoteur_can_view_consolidation_dashboard(): void
    {
        $promoteur = User::factory()->create([
            'email' => 'promoteur.test@begpharma.bj',
            'name' => 'Dr Promoteur Test',
        ]);

        $officine1 = Officine::create([
            'nom' => 'Pharmacie Alpha',
            'raison_sociale' => 'Alpha SARL',
            'numero_licence' => 'LIC-AL-'.uniqid(),
            'adresse' => 'Avenue Jean-Paul II, Cotonou',
            'ville' => 'Cotonou',
            'telephone' => '+229 21 00 00 01',
            'created_by' => $promoteur->id,
        ]);

        $officine2 = Officine::create([
            'nom' => 'Pharmacie Beta',
            'raison_sociale' => 'Beta SARL',
            'numero_licence' => 'LIC-BE-'.uniqid(),
            'adresse' => 'Boulevard Lagunaire, Porto-Novo',
            'ville' => 'Porto-Novo',
            'telephone' => '+229 20 00 00 02',
            'created_by' => $promoteur->id,
        ]);

        UtilisateurOfficine::create([
            'officine_id' => $officine1->id,
            'user_id' => $promoteur->id,
            'role_code' => 'promoteur',
            'actif' => true,
        ]);

        UtilisateurOfficine::create([
            'officine_id' => $officine2->id,
            'user_id' => $promoteur->id,
            'role_code' => 'promoteur',
            'actif' => true,
        ]);

        $produit = Produit::create([
            'code_cip' => '6170123999991',
            'nom_commercial' => 'Amoxicilline 500mg',
            'dci' => 'Amoxicilline',
            'dosage' => '500mg',
            'forme' => 'Gélule',
            'statut' => 'actif',
        ]);

        // Officine 1 a du surstock (30 boîtes)
        StockLot::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $officine1->id,
            'produit_id' => $produit->id,
            'numero_lot' => 'LOT-SURSTOCK-1',
            'date_peremption' => now()->addMonths(6)->toDateString(),
            'date_reception' => now()->toDateString(),
            'quantite_initiale' => 30,
            'quantite_disponible' => 30,
            'prix_achat_unitaire' => 1200,
            'statut' => 'en_stock',
        ]);

        // Officine 2 est en rupture (0 boîte)
        StockLot::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $officine2->id,
            'produit_id' => $produit->id,
            'numero_lot' => 'LOT-RUPTURE-2',
            'date_peremption' => now()->addMonths(12)->toDateString(),
            'date_reception' => now()->toDateString(),
            'quantite_initiale' => 10,
            'quantite_disponible' => 0,
            'prix_achat_unitaire' => 1200,
            'statut' => 'en_stock',
        ]);

        $response = $this->actingAs($promoteur)
            ->getJson('/api/promoteur/consolidation');

        $response->assertOk();
        $response->assertJsonStructure([
            'officines',
            'totaux_groupe' => [
                'nombre_officines',
                'ca_jour_total',
                'ca_mois_total',
                'valeur_stock_totale',
                'alertes_peremption_totales',
            ],
            'opportunites_transferts',
            'transferts_recents',
        ]);

        $this->assertEquals(2, $response->json('totaux_groupe.nombre_officines'));
        $this->assertNotEmpty($response->json('opportunites_transferts'));
        $this->assertEquals($produit->id, $response->json('opportunites_transferts.0.produit_id'));
    }

    public function test_promoteur_can_create_and_receive_inter_officine_transfer(): void
    {
        $promoteur = User::factory()->create([
            'email' => 'promoteur.trf@begpharma.bj',
        ]);

        $officineSource = Officine::create([
            'nom' => 'Pharmacie Source',
            'raison_sociale' => 'Pharmacie Source SARL',
            'numero_licence' => 'LIC-SRC-'.uniqid(),
            'adresse' => 'Rue du Commerce, Cotonou',
            'ville' => 'Cotonou',
            'telephone' => '+229 21 00 00 03',
            'created_by' => $promoteur->id,
        ]);

        $officineDest = Officine::create([
            'nom' => 'Pharmacie Dest',
            'raison_sociale' => 'Pharmacie Dest SARL',
            'numero_licence' => 'LIC-DST-'.uniqid(),
            'adresse' => 'Avenue de la Paix, Ouidah',
            'ville' => 'Ouidah',
            'telephone' => '+229 21 00 00 04',
            'created_by' => $promoteur->id,
        ]);

        UtilisateurOfficine::create([
            'officine_id' => $officineSource->id,
            'user_id' => $promoteur->id,
            'role_code' => 'promoteur',
            'actif' => true,
        ]);

        UtilisateurOfficine::create([
            'officine_id' => $officineDest->id,
            'user_id' => $promoteur->id,
            'role_code' => 'promoteur',
            'actif' => true,
        ]);

        $produit = Produit::create([
            'code_cip' => '6170123999992',
            'nom_commercial' => 'Paracétamol 1g',
            'dci' => 'Paracétamol',
            'dosage' => '1g',
            'forme' => 'Comprimé',
            'statut' => 'actif',
        ]);

        $lotSource = StockLot::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $officineSource->id,
            'produit_id' => $produit->id,
            'numero_lot' => 'LOT-TRF-001',
            'date_peremption' => now()->addMonths(8)->toDateString(),
            'date_reception' => now()->toDateString(),
            'quantite_initiale' => 50,
            'quantite_disponible' => 50,
            'prix_achat_unitaire' => 800,
            'statut' => 'en_stock',
        ]);

        // 1. Création du transfert (10 unités)
        $resCreate = $this->actingAs($promoteur)
            ->postJson('/api/promoteur/transferts', [
                'officine_source_id' => $officineSource->id,
                'officine_destinataire_id' => $officineDest->id,
                'motif' => 'Dépannage rupture urgente',
                'lignes' => [
                    [
                        'produit_id' => $produit->id,
                        'stock_lot_source_id' => $lotSource->id,
                        'numero_lot' => 'LOT-TRF-001',
                        'date_peremption' => now()->addMonths(8)->toDateString(),
                        'quantite' => 10,
                        'prix_unitaire_achat' => 800,
                    ],
                ],
            ]);

        $resCreate->assertCreated();
        $transfertId = $resCreate->json('transfert.id');

        // Vérifier que la source a été décrémentée
        $this->assertEquals(40, $lotSource->fresh()->quantite_disponible);

        // 2. Réception dans l'officine destinataire
        $resRec = $this->actingAs($promoteur)
            ->postJson("/api/promoteur/transferts/{$transfertId}/receptionner");

        $resRec->assertOk();
        $this->assertEquals('receptionne', $resRec->json('transfert.statut'));

        // Vérifier que le lot a été créé dans l'officine destinataire
        $lotDest = StockLot::where('officine_id', $officineDest->id)
            ->where('produit_id', $produit->id)
            ->where('numero_lot', 'LOT-TRF-001')
            ->first();

        $this->assertNotNull($lotDest);
        $this->assertEquals(10, $lotDest->quantite_disponible);
    }

    public function test_officines_gardes_crud(): void
    {
        $user = User::factory()->create();

        // 1. Liste initiale (retourne au moins les gardes par défaut si vide)
        $resList = $this->actingAs($user)->getJson('/api/gardes');
        $resList->assertOk();
        $this->assertNotEmpty($resList->json());

        // 2. Création d'une nouvelle période de garde
        $resStore = $this->actingAs($user)->postJson('/api/gardes', [
            'nom_officine' => 'Pharmacie de Test Garde',
            'commune' => 'Cotonou',
            'zone_quartier' => 'Akpakpa Dodomè',
            'telephone' => '+229 21 33 00 00',
            'date_debut' => now()->toDateTimeString(),
            'date_fin' => now()->addDays(7)->toDateTimeString(),
            'commentaires' => 'Garde 24h/24',
        ]);

        $resStore->assertCreated();
        $gardeId = $resStore->json('garde.id');

        // 3. Suppression
        $resDel = $this->actingAs($user)->deleteJson("/api/gardes/{$gardeId}");
        $resDel->assertOk();
    }
}

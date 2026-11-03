<?php

namespace Tests\Feature;

use App\Models\Dispensation;
use App\Models\Officine;
use App\Models\Produit;
use App\Models\RegistrePreparation;
use App\Models\RegistreStupefiant;
use App\Models\StockLot;
use App\Models\User;
use App\Models\UtilisateurOfficine;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class Partie3DispensationStockFefoTest extends TestCase
{
    use DatabaseTransactions;

    protected Officine $officine;
    protected User $pharmacien;
    protected User $dispensateur;

    protected function setUp(): void
    {
        parent::setUp();

        $uid = Str::random(6);
        $this->officine = Officine::create([
            'id' => (string) Str::uuid(),
            'nom' => "Grande Pharmacie de l’Étoile {$uid}",
            'raison_sociale' => "Pharmacie de l’Étoile {$uid} SARL",
            'numero_licence' => "LIC-BJ-{$uid}",
            'email' => "etoile_{$uid}@bestpharma.bj",
            'telephone' => '+229 97 00 00 99',
            'adresse' => 'Boulevard Saint-Michel, Cotonou',
        ]);

        $this->pharmacien = User::create([
            'id' => (string) Str::uuid(),
            'name' => 'Dr Armand Houenou',
            'email' => "dr.houenou_{$uid}@bestpharma.bj",
            'password' => bcrypt('Password123!'),
            'telephone' => '+229 97 11 22 33',
            'actif' => true,
        ]);

        UtilisateurOfficine::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officine->id,
            'user_id' => $this->pharmacien->id,
            'role_code' => 'pharmacien_titulaire',
            'actif' => true,
        ]);

        $this->dispensateur = User::create([
            'id' => (string) Str::uuid(),
            'name' => 'Gérard Bio',
            'email' => "gerard.bio_{$uid}@bestpharma.bj",
            'password' => bcrypt('Password123!'),
            'telephone' => '+229 95 44 55 66',
            'actif' => true,
        ]);

        UtilisateurOfficine::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officine->id,
            'user_id' => $this->dispensateur->id,
            'role_code' => 'dispensateur',
            'actif' => true,
        ]);
    }

    public function test_produit_et_reception_stock_grossiste(): void
    {
        $token = $this->dispensateur->createToken('test')->plainTextToken;
        $cipUid = Str::random(5);

        // 1. Créer un produit
        $produitResp = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/produits', [
                'code_cip' => "CIP-{$cipUid}",
                'nom_commercial' => 'Amoxicilline 500mg Gélules',
                'dci' => 'Amoxicilline trihydratée',
                'forme' => 'Gélule',
                'dosage' => '500mg',
                'classe_therapeutique' => 'Antibactérien',
                'tableau_substance' => 'liste_1',
                'est_thermolabile' => false,
                'necessite_ordonnance' => true,
                'prix_achat_ht' => 1200,
                'prix_public_ttc' => 1800,
                'seuil_stock_min' => 10,
            ]);

        $produitResp->assertStatus(201);
        $produitId = $produitResp->json('data.id');

        // 2. Réceptionner deux lots avec dates d'expiration différentes (FEFO)
        // Lot B (expire dans 1 an)
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/stocks', [
                'produit_id' => $produitId,
                'numero_lot' => 'LOT-AMX-2027',
                'date_peremption' => Carbon::now()->addYear()->format('Y-m-d'),
                'quantite' => 50,
                'fournisseur_nom' => 'CAMEG BÉNIN',
                'bon_livraison_ref' => 'BL-2026-0044',
            ])->assertStatus(201);

        // Lot A (expire plus tôt : dans 3 mois) -> Doit sortir EN PREMIER
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/stocks', [
                'produit_id' => $produitId,
                'numero_lot' => 'LOT-AMX-2026-T1',
                'date_peremption' => Carbon::now()->addMonths(3)->format('Y-m-d'),
                'quantite' => 20,
                'fournisseur_nom' => 'UBIPHARM BÉNIN',
                'bon_livraison_ref' => 'BL-2026-0055',
            ])->assertStatus(201);

        // 3. Vérifier que l'API catalogue identifie le lot le plus proche de la péremption (FEFO)
        $catResp = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/produits?q=Amoxicilline');

        $catResp->assertStatus(200);
        $this->assertEquals(70, $catResp->json('data.0.stock_total'));
        $this->assertEquals('LOT-AMX-2026-T1', $catResp->json('data.0.prochain_lot_fefo.numero_lot'));
    }

    public function test_dispensation_ordonnance_respecte_fefo(): void
    {
        $token = $this->dispensateur->createToken('test')->plainTextToken;

        $produit = Produit::create([
            'officine_id' => $this->officine->id,
            'code_cip' => 'CIP-PARACETAMOL-1G',
            'nom_commercial' => 'Paracétamol 1g Comprimés',
            'dci' => 'Paracétamol',
            'tableau_substance' => 'sans',
            'prix_public_ttc' => 500,
        ]);

        // Lot 1 : Expire dans 2 mois, qte 10
        $lot1 = StockLot::create([
            'officine_id' => $this->officine->id,
            'produit_id' => $produit->id,
            'numero_lot' => 'LOT-EARLY',
            'date_peremption' => Carbon::now()->addMonths(2),
            'quantite_initiale' => 10,
            'quantite_disponible' => 10,
            'statut' => 'en_stock',
        ]);

        // Lot 2 : Expire dans 1 an, qte 20
        $lot2 = StockLot::create([
            'officine_id' => $this->officine->id,
            'produit_id' => $produit->id,
            'numero_lot' => 'LOT-LATER',
            'date_peremption' => Carbon::now()->addYear(),
            'quantite_initiale' => 20,
            'quantite_disponible' => 20,
            'statut' => 'en_stock',
        ]);

        // On dispense 15 unités : Le système FEFO doit prélever les 10 du Lot 1 (qui s'épuise) et 5 du Lot 2
        $dispResp = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/dispensations', [
                'type_dispensation' => 'ordonnance',
                'patient_nom' => 'Koffi Dossou',
                'patient_age' => 45,
                'prescripteur_nom' => 'Dr Akpatcha',
                'prescripteur_centre' => 'CNHU Hubert Maga',
                'lignes' => [
                    [
                        'produit_id' => $produit->id,
                        'quantite' => 15,
                        'posologie' => '1 cp matin et soir si fièvre',
                        'duree_traitement' => '5 jours',
                    ],
                ],
            ]);

        $dispResp->assertStatus(201);

        // Vérification des stocks après FEFO
        $lot1->refresh();
        $lot2->refresh();

        $this->assertEquals(0, $lot1->quantite_disponible);
        $this->assertEquals('epuise', $lot1->statut);
        $this->assertEquals(15, $lot2->quantite_disponible);
    }

    public function test_registre_stupefiants_balance_inalterable(): void
    {
        $token = $this->pharmacien->createToken('test')->plainTextToken;

        $morphine = Produit::create([
            'officine_id' => $this->officine->id,
            'code_cip' => 'CIP-MORPH-10MG',
            'nom_commercial' => 'Morphine Chlorhydrate 10mg Ampoules',
            'dci' => 'Morphine',
            'tableau_substance' => 'stupefiant',
            'prix_public_ttc' => 2500,
        ]);

        // 1. Entrée de stock stupéfiant (20 ampoules)
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/stocks', [
                'produit_id' => $morphine->id,
                'numero_lot' => 'LOT-MOR-001',
                'date_peremption' => Carbon::now()->addMonths(18)->format('Y-m-d'),
                'quantite' => 20,
                'fournisseur_nom' => 'CAMEG BÉNIN',
                'bon_livraison_ref' => 'BL-STUP-99',
            ])->assertStatus(201);

        // Vérifier l'inscription au registre des stupéfiants
        $registreResp = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/stupefiants');

        $registreResp->assertStatus(200);
        $this->assertCount(1, $registreResp->json('data.data'));
        $this->assertEquals(20, $registreResp->json('balance_produits.0.stock_physique_lots'));
        $this->assertTrue($registreResp->json('balance_produits.0.concordance_exacte'));

        // 2. Sortie par dispensation ordonnance sécurisée (5 ampoules)
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/dispensations', [
                'type_dispensation' => 'ordonnance',
                'patient_nom' => 'Aïssatou Soumanou',
                'patient_age' => 58,
                'prescripteur_nom' => 'Dr Zinsou (Cancérologie CNHU)',
                'lignes' => [
                    [
                        'produit_id' => $morphine->id,
                        'quantite' => 5,
                        'posologie' => '1 ampoule en sous-cutané selon protocole',
                    ],
                ],
            ])->assertStatus(201);

        // Vérifier la mise à jour de la balance inaltérable
        $registreResp2 = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/stupefiants');

        $this->assertCount(2, $registreResp2->json('data.data'));
        $this->assertEquals(15, $registreResp2->json('balance_produits.0.stock_physique_lots'));
        $this->assertEquals(15, $registreResp2->json('balance_produits.0.stock_theorique_registre'));
        $this->assertTrue($registreResp2->json('balance_produits.0.concordance_exacte'));
    }

    public function test_registre_preparations_magistrales_et_visa(): void
    {
        $token = $this->pharmacien->createToken('test')->plainTextToken;

        $prepResp = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/preparations', [
                'nom_preparation' => 'Pommade à l’Oxyde de Zinc 10%',
                'type_preparation' => 'magistrale',
                'formule_detaillee' => 'Oxyde de zinc 10g, Vaseline blanche 90g',
                'quantite_produite' => '100g',
                'conditionnement' => 'Pot hermétique opaque',
                'date_fabrication' => Carbon::now()->format('Y-m-d'),
                'date_limite_utilisation' => Carbon::now()->addMonths(1)->format('Y-m-d'),
                'patient_nom' => 'Enfant Tossou (Dermatite)',
                'prescripteur_nom' => 'Dr Agbodjogbe (Pédiatre)',
            ]);

        $prepResp->assertStatus(201);
        $this->assertNotNull($prepResp->json('data.numero_preparation'));
        $this->assertTrue($prepResp->json('data.conforme'));
    }
}

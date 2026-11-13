<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Achats\Models\Supplier;
use App\Modules\LocauxEquipements\Models\Equipment;
use App\Modules\Qualite\Models\QualityAction;
use App\Modules\Stock\Models\Lot;
use App\Modules\Stock\Models\Product;
use App\Modules\Stock\Models\StockMovement;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Module11ProduitStockTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Officine $office;
    private Supplier $supplier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::create([
            'name' => 'Titulaire Stock M11',
            'email' => 'admin-m11@example.test',
            'password' => 'Fictional12345',
        ]);
        $this->office = Officine::create([
            'name' => 'Pharmacie Recette M11',
            'slug' => 'pharmacie-recette-m11',
            'status' => 'active',
        ]);

        DB::table('officine_user')->insert([
            'user_id' => $this->admin->id,
            'officine_id' => $this->office->id,
            'is_admin' => false,
            'is_active' => true,
            'permissions' => json_encode(['stock.read', 'stock.write']),
        ]);
        DB::table('officine_modules')->insert([
            ['officine_id' => $this->office->id, 'module' => 'qualite', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'achats', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'stock', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'catalogue', 'is_active' => true],
        ]);

        $this->supplier = Supplier::create([
            'officine_id' => $this->office->id,
            'code' => 'FRN-GROS-M11',
            'name' => 'UBPHAR Grossiste',
            'type' => 'grossiste',
            'status' => 'qualifie',
            'version' => 1,
        ]);

        Sanctum::actingAs($this->admin);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    public function test_overview_indicators_with_non_disponible_default(): void
    {
        $res = $this->getJson('/api/v1/stock/overview');
        $res->assertOk();
        $res->assertJsonStructure([
            'meta' => ['officine_id', 'as_of', 'period'],
            'kpis' => [
                'total_products',
                'below_threshold_products',
                'pending_orders',
                'total_lots_available',
                'expiring_soon_lots',
                'quarantine_lots',
                'cold_chain_excursions',
                'stock_conformity_rate',
            ],
        ]);
        $this->assertEquals('non disponible', $res->json('kpis.stock_conformity_rate'));
    }

    public function test_catalogue_product_amm_guard_and_optimistic_lock(): void
    {
        // CDC 3.1 : Ne pas affirmer une AMM sans source officielle vérifiée
        $res = $this->postJson('/api/v1/stock/products', [
            'code' => 'AMOX-500',
            'name' => 'Amoxicilline 500mg Gélule',
            'dci' => 'Amoxicilline',
            'dosage' => '500mg',
            'pharmaceutical_form' => 'Gélule',
            'base_unit' => 'Boîte de 12',
            'category' => 'medicament',
            'default_supplier_id' => $this->supplier->id,
            'min_stock_threshold' => 20,
            'reorder_quantity' => 50,
            'purchase_price' => 850,
            'selling_price' => 1250,
            'amm_number' => 'AMM-BJ-2025-100',
            'amm_source_verified' => true, // Pas de amm_source_label !
            'units' => [
                ['unit_name' => 'Plaquette', 'conversion_factor' => 2, 'is_default_dispense' => false],
                ['unit_name' => 'Gélule', 'conversion_factor' => 12, 'is_default_dispense' => true],
            ],
        ]);
        $res->assertCreated();
        $productId = $res->json('data.id');
        $this->assertFalse($res->json('data.amm_source_verified'));
        $this->assertCount(2, $res->json('data.units'));

        // Conflit de version 409
        $this->putJson("/api/v1/stock/products/{$productId}", [
            'selling_price' => 1300,
            'version' => 99,
        ])->assertStatus(409);

        $this->putJson("/api/v1/stock/products/{$productId}", [
            'selling_price' => 1300,
            'version' => 1,
        ])->assertOk()->assertJsonPath('data.version', 2);
    }

    public function test_order_suggestions_partial_and_idempotent_receipts(): void
    {
        $product = Product::create([
            'officine_id' => $this->office->id,
            'code' => 'PARA-1G',
            'name' => 'Paracétamol 1g Comprimé',
            'base_unit' => 'Boîte',
            'default_supplier_id' => $this->supplier->id,
            'min_stock_threshold' => 20,
            'reorder_quantity' => 50,
            'purchase_price' => 500,
            'selling_price' => 750,
            'version' => 1,
        ]);

        // 1. Suggestion automatique car stock = 0 < 20
        $sugRes = $this->getJson('/api/v1/stock/order-suggestions');
        $sugRes->assertOk();
        $this->assertCount(1, $sugRes->json('data'));
        $this->assertEquals(50, $sugRes->json('data.0.suggested_qty'));

        // 2. Création et approbation commande
        $poRes = $this->postJson('/api/v1/stock/orders', [
            'reference' => 'CMD-2026-001',
            'supplier_id' => $this->supplier->id,
            'order_date' => now()->toDateString(),
            'lines' => [
                ['product_id' => $product->id, 'ordered_qty' => 50, 'unit_price' => 500],
            ],
        ]);
        $poRes->assertCreated();
        $orderId = $poRes->json('data.id');
        $orderLineId = $poRes->json('data.lines.0.id');

        $this->postJson("/api/v1/stock/orders/{$orderId}/approve", ['action' => 'emis'])->assertOk();

        // 3. Réception partielle (30 sur 50) avec clé d'idempotence (CDC 7)
        $payload = [
            'reference' => 'REC-2026-001',
            'idempotency_key' => 'idem-rec-2026-001-part1',
            'purchase_order_id' => $orderId,
            'supplier_id' => $this->supplier->id,
            'delivery_note_ref' => 'BL-8840',
            'parcel_count' => 2,
            'lines' => [
                [
                    'order_line_id' => $orderLineId,
                    'product_id' => $product->id,
                    'batch_number' => 'LOT-PAR-01',
                    'expiry_date' => now()->addMonths(18)->toDateString(),
                    'received_qty' => 30,
                    'unit_cost' => 500,
                ],
            ],
        ];
        $rec1 = $this->postJson('/api/v1/stock/receipts', $payload);
        $rec1->assertCreated();
        $this->assertEquals('partiel', $rec1->json('data.status'));
        $this->assertFalse($rec1->json('replayed'));

        // Rejeu / double-clic idempotent -> retourne 200 & replayed = true sans doubler le stock !
        $replay = $this->postJson('/api/v1/stock/receipts', $payload);
        $replay->assertOk();
        $this->assertTrue($replay->json('replayed'));

        $lot = Lot::where('officine_id', $this->office->id)->where('batch_number', 'LOT-PAR-01')->first();
        $this->assertNotNull($lot);
        $this->assertEquals(30, $lot->available_qty);
        $this->assertEquals(1, StockMovement::where('lot_id', $lot->id)->count());

        // 4. Réception complémentaire des 20 restants -> commande passe 'recu'
        $rec2 = $this->postJson('/api/v1/stock/receipts', [
            'reference' => 'REC-2026-002',
            'idempotency_key' => 'idem-rec-2026-001-part2',
            'purchase_order_id' => $orderId,
            'supplier_id' => $this->supplier->id,
            'delivery_note_ref' => 'BL-8899',
            'lines' => [
                [
                    'order_line_id' => $orderLineId,
                    'product_id' => $product->id,
                    'batch_number' => 'LOT-PAR-01',
                    'expiry_date' => now()->addMonths(18)->toDateString(),
                    'received_qty' => 20,
                    'unit_cost' => 500,
                ],
            ],
        ]);
        $rec2->assertCreated();
        $lot->refresh();
        $this->assertEquals(50, $lot->available_qty);
        $this->assertDatabaseHas('purchase_orders', ['id' => $orderId, 'status' => 'recu']);
    }

    public function test_thermosensitive_non_conforming_receipt_quarantines_lot_and_blocks_sale(): void
    {
        $insuline = Product::create([
            'officine_id' => $this->office->id,
            'code' => 'INS-LANTUS',
            'name' => 'Insuline Glargine 100 UI/ml',
            'storage_condition' => 'froid_2_8',
            'is_thermosensitive' => true,
            'default_supplier_id' => $this->supplier->id,
            'version' => 1,
        ]);

        // Rupture chaîne du froid à l'arrivée (13.4°C) -> Quarantaine automatique + CAPA M4
        $recRes = $this->postJson('/api/v1/stock/receipts', [
            'reference' => 'REC-COLD-01',
            'supplier_id' => $this->supplier->id,
            'delivery_note_ref' => 'BL-FROID-09',
            'has_thermosensitive_items' => true,
            'arrival_temperature' => 13.4,
            'cold_chain_compliant' => false,
            'reserves' => 'Boîte isotherme tiède à la réception.',
            'lines' => [
                [
                    'product_id' => $insuline->id,
                    'batch_number' => 'INS-2026-Q',
                    'expiry_date' => now()->addYear()->toDateString(),
                    'received_qty' => 10,
                    'unit_cost' => 15000,
                ],
            ],
        ]);
        $recRes->assertCreated();
        $this->assertEquals('quarantaine', $recRes->json('data.status'));
        $this->assertNotNull($recRes->json('data.created_action_id'));

        $capa = QualityAction::withoutGlobalScopes()->find($recRes->json('data.created_action_id'));
        $this->assertNotNull($capa);

        $lot = Lot::where('officine_id', $this->office->id)->where('batch_number', 'INS-2026-Q')->first();
        $this->assertEquals('quarantaine', $lot->status);
        $this->assertFalse($lot->is_sellable);

        // CDC 7 : lot en quarantaine invendable -> vente refusée (422)
        $saleRes = $this->postJson('/api/v1/stock/movements', [
            'lot_id' => $lot->id,
            'movement_type' => 'vente',
            'quantity' => 1,
            'reason' => 'Test vente illicite sur quarantaine',
        ]);
        $saleRes->assertStatus(422);

        // Levée quarantaine -> vente autorisée mais stock négatif interdit
        $this->postJson("/api/v1/stock/lots/{$lot->id}/quarantine", [
            'event_type' => 'levee_quarantaine',
            'reason' => 'Données enregistreur conformes après vérification labo.',
        ])->assertCreated();

        // Tentative de vendre 15 alors qu'il n'y en a que 10 -> 422 stock négatif interdit
        $this->postJson('/api/v1/stock/movements', [
            'lot_id' => $lot->id,
            'movement_type' => 'vente',
            'quantity' => 15,
            'reason' => 'Vente supérieure au stock',
        ])->assertStatus(422);

        // Vente valide de 4 unités -> reste 6
        $this->postJson('/api/v1/stock/movements', [
            'lot_id' => $lot->id,
            'movement_type' => 'vente',
            'quantity' => 4,
            'reason' => 'Dispensation ordonnance #441',
        ])->assertCreated();
        $lot->refresh();
        $this->assertEquals(6, $lot->available_qty);
    }

    public function test_inventory_variance_approval_and_recall_blocks_release(): void
    {
        $product = Product::create([
            'officine_id' => $this->office->id,
            'code' => 'VIT-C',
            'name' => 'Vitamine C 500mg',
            'default_supplier_id' => $this->supplier->id,
            'version' => 1,
        ]);
        $lot = Lot::create([
            'officine_id' => $this->office->id,
            'product_id' => $product->id,
            'supplier_id' => $this->supplier->id,
            'batch_number' => 'LOT-VIT-9',
            'expiry_date' => now()->addMonths(8)->toDateString(),
            'initial_qty' => 40,
            'available_qty' => 40,
            'unit_cost' => 300,
            'status' => 'disponible',
            'is_sellable' => true,
            'version' => 1,
        ]);

        // Inventaire : 37 comptées vs 40 théoriques (écart -3)
        $invRes = $this->postJson('/api/v1/stock/inventories', [
            'reference' => 'INV-2026-01',
            'inventory_date' => now()->toDateString(),
            'scope_description' => 'Contrôle comptoir',
            'lines' => [
                ['lot_id' => $lot->id, 'counted_qty' => 37, 'justification' => '3 boîtes abîmées écartées'],
            ],
        ]);
        $invRes->assertCreated();
        $this->assertEquals(-3, $invRes->json('data.total_variance_qty'));
        $invId = $invRes->json('data.id');

        // Approbation Titulaire -> ajuste le lot à 37 et trace le mouvement
        $this->postJson("/api/v1/stock/inventories/{$invId}/approve")->assertOk();
        $lot->refresh();
        $this->assertEquals(37, $lot->available_qty);

        // Rappel de lot -> impossible à libérer en vente ensuite
        $this->postJson("/api/v1/stock/lots/{$lot->id}/quarantine", [
            'event_type' => 'rappel',
            'reason' => 'Alerte rappel lot fabricant N° 2026-R12',
        ])->assertCreated();

        $this->postJson("/api/v1/stock/lots/{$lot->id}/quarantine", [
            'event_type' => 'levee_quarantaine',
            'reason' => 'Tentative libération rappel',
        ])->assertStatus(422);
    }

    public function test_cold_chain_excursion_triggers_capa_and_pharmacist_decision(): void
    {
        $fridge = Equipment::create([
            'officine_id' => $this->office->id,
            'code' => 'FRIGO-M11',
            'designation' => 'Enceinte Réfrigérée Vaccins',
            'category' => 'froid',
            'status' => 'en_service',
            'criticality' => 'critique_bpd',
            'version' => 1,
        ]);

        // Excursion à 10.2°C (seuil 2°C - 8°C)
        $tempRes = $this->postJson('/api/v1/stock/temperatures', [
            'equipment_id' => $fridge->id,
            'zone_name' => 'Enceinte 2-8°C Principale',
            'measured_temperature' => 10.2,
            'min_threshold' => 2.0,
            'max_threshold' => 8.0,
            'incident_notes' => 'Porte restée entrouverte 15 min pendant déchargement.',
        ]);
        $tempRes->assertCreated();
        $this->assertTrue($tempRes->json('data.is_excursion'));
        $this->assertEquals('incident_ouvert', $tempRes->json('data.effectiveness_status'));
        $this->assertNotNull($tempRes->json('data.created_action_id'));

        $readingId = $tempRes->json('data.id');
        $this->postJson("/api/v1/stock/temperatures/{$readingId}/decision", [
            'pharmacist_decision' => 'Retour à 4.5°C en 20 min, stabilité produits validée selon fiche fabricant.',
            'effectiveness_status' => 'resolu',
        ])->assertOk()->assertJsonPath('data.effectiveness_status', 'resolu');
    }
}

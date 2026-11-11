<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Activer les modules stock & catalogue pour les officines existantes
        $officineIds = DB::table('officines')->pluck('id');
        foreach ($officineIds as $id) {
            foreach (['stock', 'catalogue'] as $mod) {
                DB::table('officine_modules')->updateOrInsert(
                    ['officine_id' => $id, 'module' => $mod],
                    ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]
                );
            }
        }

        // 2. Catalogue Produits (CDC 3.1)
        Schema::create('products', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('code');
            $table->string('barcode')->nullable();
            $table->string('name');
            $table->string('dci')->nullable();
            $table->string('dosage')->nullable();
            $table->string('pharmaceutical_form')->nullable();
            $table->string('base_unit')->default('Boîte');
            $table->string('category')->default('medicament'); // medicament, parapharmacie, dispositif_medical, stupefiant, reactif, autre
            $table->foreignId('default_supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->string('storage_condition')->default('ambiant'); // ambiant, froid_2_8, congele, controle_b
            $table->boolean('is_thermosensitive')->default(false);
            $table->unsignedInteger('min_stock_threshold')->default(10);
            $table->unsignedInteger('reorder_quantity')->default(30);
            $table->decimal('purchase_price', 12, 2)->default(0.00);
            $table->decimal('selling_price', 12, 2)->default(0.00);
            $table->string('amm_number')->nullable();
            $table->boolean('amm_source_verified')->default(false); // CDC 3.1 : ne pas affirmer AMM sans source vérifiée
            $table->string('amm_source_label')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'code']);
            $table->index(['officine_id', 'category']);
            $table->index(['officine_id', 'is_thermosensitive']);
        });

        // 3. Unités & Conditionnements Produits (CDC 3.1)
        Schema::create('product_units', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('unit_name'); // ex: Boîte, Plaquette, Comprimé, Flacon
            $table->unsignedInteger('conversion_factor')->default(1); // nb d'unités de base ou sous-unités
            $table->boolean('is_default_dispense')->default(false);
            $table->timestamps();

            $table->index(['officine_id', 'product_id']);
        });

        // 4. Commandes d'Approvisionnement (CDC 3.2)
        Schema::create('purchase_orders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('reference');
            $table->foreignId('supplier_id')->constrained('suppliers')->restrictOnDelete();
            $table->string('status')->default('brouillon'); // brouillon, a_approuver, approuve, emis, partiel, recu, annule
            $table->date('order_date');
            $table->date('expected_delivery_date')->nullable();
            $table->json('suggestion_origin')->nullable(); // traçabilité calcul suggestion
            $table->decimal('total_estimated_amount', 14, 2)->default(0.00);
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('emitted_at')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'status']);
        });

        // 5. Lignes de Commande (CDC 3.2)
        Schema::create('order_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('purchase_order_id')->constrained('purchase_orders')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->unsignedInteger('ordered_qty');
            $table->unsignedInteger('received_qty')->default(0);
            $table->decimal('unit_price', 12, 2)->default(0.00);
            $table->decimal('line_total', 14, 2)->default(0.00);
            $table->timestamps();

            $table->index(['officine_id', 'purchase_order_id']);
        });

        // 6. Réceptions Commandes & Contrôles (CDC 3.3 & 7)
        Schema::create('receipts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('reference');
            $table->string('idempotency_key')->nullable(); // CDC 7 : réception partielle et idempotente
            $table->foreignId('purchase_order_id')->nullable()->constrained('purchase_orders')->nullOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->restrictOnDelete();
            $table->string('delivery_note_ref');
            $table->unsignedSmallInteger('parcel_count')->default(1);
            $table->timestamp('received_at');
            $table->foreignId('received_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('has_thermosensitive_items')->default(false);
            $table->decimal('arrival_temperature', 5, 2)->nullable();
            $table->boolean('cold_chain_compliant')->nullable();
            $table->string('pharmacist_decision')->nullable(); // accepte, quarantaine, refuse
            $table->text('reserves')->nullable();
            $table->string('status')->default('valide'); // valide, partiel, quarantaine, refuse
            $table->unsignedBigInteger('created_action_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->unique(['officine_id', 'idempotency_key']);
            $table->index(['officine_id', 'status']);
        });

        // 7. Lots physiques & FEFO (CDC 3.4 & 3.5)
        Schema::create('lots', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->string('batch_number');
            $table->date('expiry_date');
            $table->string('storage_zone')->default('Magasin / Réserve');
            $table->unsignedInteger('initial_qty')->default(0);
            $table->integer('available_qty')->default(0);
            $table->unsignedInteger('reserved_qty')->default(0);
            $table->decimal('unit_cost', 12, 2)->default(0.00);
            $table->string('status')->default('disponible'); // disponible, quarantaine, rappele, perime, epuise, detruit
            $table->boolean('is_sellable')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'product_id', 'batch_number']);
            $table->index(['officine_id', 'expiry_date']);
            $table->index(['officine_id', 'status', 'is_sellable']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE lots ADD CONSTRAINT lots_available_qty_nonnegative CHECK (available_qty >= 0)');
        }

        // 8. Lignes de Réception (CDC 3.3)
        Schema::create('receipt_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('receipt_id')->constrained('receipts')->cascadeOnDelete();
            $table->foreignId('order_line_id')->nullable()->constrained('order_lines')->nullOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('lot_id')->nullable()->constrained('lots')->nullOnDelete();
            $table->string('batch_number');
            $table->date('expiry_date');
            $table->unsignedInteger('ordered_qty')->default(0);
            $table->unsignedInteger('received_qty');
            $table->unsignedInteger('accepted_qty')->default(0);
            $table->unsignedInteger('rejected_qty')->default(0);
            $table->decimal('unit_cost', 12, 2)->default(0.00);
            $table->string('conformity_status')->default('conforme'); // conforme, quarantaine, refuse
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['officine_id', 'receipt_id']);
        });

        // 9. Mouvements de Stock traçables (CDC 3.4)
        Schema::create('stock_movements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('lot_id')->constrained('lots')->restrictOnDelete();
            $table->string('movement_type'); // reception, vente, transfert, inventaire_plus, inventaire_moins, quarantaine, liberation, rappel, retour_fournisseur, destruction
            $table->integer('quantity_delta');
            $table->unsignedInteger('balance_after');
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('reason');
            $table->foreignId('performed_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('performed_at');
            $table->timestamps();

            $table->index(['officine_id', 'product_id', 'performed_at']);
            $table->index(['officine_id', 'lot_id']);
        });

        // 10. Inventaires Physiques & Écarts (CDC 3.4)
        Schema::create('inventories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('reference');
            $table->date('inventory_date');
            $table->string('scope_description')->default('Inventaire général');
            $table->string('status')->default('brouillon'); // brouillon, compte, approuve, annule
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->integer('total_variance_qty')->default(0);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
        });

        Schema::create('inventory_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('inventory_id')->constrained('inventories')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('lot_id')->constrained('lots')->restrictOnDelete();
            $table->unsignedInteger('theoretical_qty');
            $table->unsignedInteger('counted_qty');
            $table->integer('variance_qty');
            $table->text('justification')->nullable();
            $table->timestamps();

            $table->index(['officine_id', 'inventory_id']);
        });

        // 11. Événements Quarantaine, Rappels, Retours & Destructions (CDC 3.5)
        Schema::create('quarantine_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('lot_id')->constrained('lots')->restrictOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->string('event_type'); // quarantaine, rappel, levee_quarantaine, retour_fournisseur, destruction
            $table->unsignedInteger('quantity');
            $table->text('reason');
            $table->string('proof_reference')->nullable();
            $table->string('status')->default('ouvert'); // ouvert, valide, cloture
            $table->foreignId('initiated_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('validated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('validated_at')->nullable();
            $table->unsignedBigInteger('created_action_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'event_type', 'status']);
        });

        // 12. Chaîne du Froid par Équipement (CDC 3.6)
        Schema::create('temperature_readings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('equipment_id')->nullable()->constrained('equipments')->nullOnDelete();
            $table->string('zone_name');
            $table->decimal('measured_temperature', 5, 2);
            $table->decimal('min_threshold', 5, 2)->default(2.00);
            $table->decimal('max_threshold', 5, 2)->default(8.00);
            $table->boolean('is_excursion')->default(false);
            $table->timestamp('measured_at');
            $table->foreignId('recorded_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->text('incident_notes')->nullable();
            $table->text('pharmacist_decision')->nullable();
            $table->string('effectiveness_status')->default('conforme'); // conforme, a_surveiller, incident_ouvert, resolu
            $table->unsignedBigInteger('created_action_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'measured_at']);
            $table->index(['officine_id', 'is_excursion']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('temperature_readings');
        Schema::dropIfExists('quarantine_events');
        Schema::dropIfExists('inventory_lines');
        Schema::dropIfExists('inventories');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('receipt_lines');
        Schema::dropIfExists('lots');
        Schema::dropIfExists('receipts');
        Schema::dropIfExists('order_lines');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('product_units');
        Schema::dropIfExists('products');
    }
};

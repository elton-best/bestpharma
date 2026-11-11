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
        $officineIds = DB::table('officines')->pluck('id');
        foreach ($officineIds as $id) {
            foreach (['dispensation', 'ventescaisse'] as $mod) {
                DB::table('officine_modules')->updateOrInsert(
                    ['officine_id' => $id, 'module' => $mod],
                    ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]
                );
            }
        }

        // 1. Ventes & Parcours Comptoir (CDC 3.1 & 3.4)
        Schema::create('sales', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('reference');
            $table->string('idempotency_key')->nullable();
            $table->string('sale_type')->default('comptoir_libre'); // comptoir_libre, ordonnance, conseil
            $table->string('status')->default('brouillon'); // brouillon, en_analyse, validee, transmise_caisse, payee, annulee
            $table->string('patient_minimized_ref')->nullable(); // Minimisation : pas de nom obligatoire
            $table->decimal('total_amount', 12, 2)->default(0.00);
            $table->string('payment_status')->default('en_attente'); // en_attente, confirme, annule, rembourse
            $table->string('payment_method')->nullable(); // especes, mobile_money, carte, credit
            $table->foreignId('cashier_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('validated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('validated_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->unique(['officine_id', 'idempotency_key']);
            $table->index(['officine_id', 'status']);
        });

        // 2. Lignes de Vente (CDC 3.1 & 3.3)
        Schema::create('sale_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('lot_id')->nullable()->constrained('lots')->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('line_total', 14, 2);
            $table->text('dispensing_advice')->nullable();
            $table->boolean('is_substituted')->default(false);
            $table->string('substitution_reason')->nullable();
            $table->timestamps();

            $table->index(['officine_id', 'sale_id']);
        });

        // 3. Références d'Ordonnance (CDC 3.2)
        Schema::create('prescription_references', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            $table->string('prescription_ref');
            $table->string('prescriber_name')->nullable();
            $table->string('prescriber_qualification')->nullable();
            $table->date('prescription_date');
            $table->unsignedBigInteger('document_id')->nullable(); // Lien Module 03 GED
            $table->boolean('is_controlled_substance')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['officine_id', 'sale_id']);
        });

        // 4. Analyses Pharmaceutiques (CDC 3.2)
        Schema::create('pharmaceutical_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            $table->foreignId('pharmacist_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('decision'); // approuve, reserve, refuse, substitution
            $table->boolean('posology_checked')->default(true);
            $table->boolean('interactions_checked')->default(true);
            $table->boolean('contraindications_checked')->default(true);
            $table->text('clinical_notes')->nullable();
            $table->timestamp('reviewed_at');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'sale_id']);
        });

        // 5. Événements de Délivrance Atomiques (CDC 3.4)
        Schema::create('dispensing_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            $table->foreignId('sale_line_id')->constrained('sale_lines')->cascadeOnDelete();
            $table->foreignId('lot_id')->constrained('lots')->restrictOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->unsignedInteger('quantity_dispensed');
            $table->foreignId('dispensed_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('dispensed_at');
            $table->text('counsel_given')->nullable();
            $table->timestamps();

            $table->index(['officine_id', 'sale_id']);
        });

        // 6. Retours Clients (CDC 3.5 & 7 - sans réintégration auto)
        Schema::create('returns', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('reference');
            $table->foreignId('sale_id')->constrained('sales')->restrictOnDelete();
            $table->foreignId('sale_line_id')->nullable()->constrained('sale_lines')->nullOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('lot_id')->nullable()->constrained('lots')->nullOnDelete();
            $table->unsignedInteger('quantity_returned');
            $table->text('reason');
            $table->string('pharmacist_decision')->default('en_attente'); // en_attente, quarantaine, destruction, reintegration_validee
            $table->string('status')->default('demande'); // demande, evalue, cloture, rejete
            $table->foreignId('requested_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('evaluated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('evaluated_at')->nullable();
            $table->unsignedBigInteger('created_action_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'status']);
        });

        // 7. Avoirs Commerciaux liés aux Ventes/Retours (CDC 3.5)
        Schema::create('credits', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('credit_ref');
            $table->foreignId('sale_id')->constrained('sales')->restrictOnDelete();
            $table->foreignId('return_id')->nullable()->constrained('returns')->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('status')->default('emis'); // brouillon, emis, utilise, annule
            $table->foreignId('issued_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('issued_at');
            $table->text('reason');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'credit_ref']);
            $table->index(['officine_id', 'sale_id']);
        });

        // 8. Signalements Défauts Qualité / Pharmacovigilance (CDC 3.6)
        Schema::create('safety_reports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('reference');
            $table->foreignId('sale_id')->nullable()->constrained('sales')->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->foreignId('lot_id')->nullable()->constrained('lots')->nullOnDelete();
            $table->string('report_type'); // defaut_qualite, effet_indesirable, erreur_dispensation, contrefacon_suspectee
            $table->string('severity')->default('modere'); // faible, modere, grave
            $table->text('description');
            $table->string('external_transmission_status')->default('local_uniquement'); // local_uniquement, transmis_avec_accuse
            $table->string('external_ack_ref')->nullable(); // CDC 5 : aucune transmission ABMed prétendue sans accusé effectif
            $table->foreignId('reported_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('reported_at');
            $table->unsignedBigInteger('created_action_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'report_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('safety_reports');
        Schema::dropIfExists('credits');
        Schema::dropIfExists('returns');
        Schema::dropIfExists('dispensing_events');
        Schema::dropIfExists('pharmaceutical_reviews');
        Schema::dropIfExists('prescription_references');
        Schema::dropIfExists('sale_lines');
        Schema::dropIfExists('sales');
    }
};

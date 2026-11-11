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
        // 1. Activer le module locauxequipements pour toutes les officines existantes
        $officineIds = DB::table('officines')->pluck('id');
        foreach ($officineIds as $id) {
            DB::table('officine_modules')->updateOrInsert(
                ['officine_id' => $id, 'module' => 'locauxequipements'],
                ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        // 2. Emplacements des locaux (Zones)
        Schema::create('equipment_locations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'name']);
        });

        // 3. Inventaire des Équipements
        Schema::create('equipments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('code');
            $table->string('designation');
            $table->string('category')->default('froid'); // froid, climatisation, energie, pesage, informatique, securite, autre
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('serial_number')->nullable();
            $table->unsignedSmallInteger('acquisition_year')->nullable();
            $table->date('installation_date')->nullable();
            $table->foreignId('current_location_id')->nullable()->constrained('equipment_locations')->nullOnDelete();
            $table->string('status')->default('en_service'); // en_service, en_panne, en_maintenance, hors_service
            $table->string('criticality')->default('critique_bpd'); // critique_bpd, standard
            $table->text('notes')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'code']);
            $table->index(['officine_id', 'status']);
            $table->index(['officine_id', 'category']);
        });

        // 4. Historique des déplacements d'équipements (CDC 7)
        Schema::create('equipment_location_histories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('equipment_id')->constrained('equipments')->cascadeOnDelete();
            $table->foreignId('location_id')->constrained('equipment_locations')->cascadeOnDelete();
            $table->timestamp('moved_at');
            $table->foreignId('moved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->index(['officine_id', 'equipment_id']);
        });

        // 5. Fiches de mise en service (CDC 3.2)
        Schema::create('commissioning_tests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('equipment_id')->constrained('equipments')->cascadeOnDelete();
            $table->date('test_date');
            $table->foreignId('conducted_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('electrical_safety_checked')->default(false);
            $table->boolean('functional_test_passed')->default(false);
            $table->boolean('temperature_conformity_passed')->nullable();
            $table->boolean('calibration_checked')->nullable();
            $table->boolean('staff_trained')->default(false);
            $table->string('decision')->default('conforme'); // conforme, non_conforme, avec_reserve
            $table->text('notes')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'equipment_id']);
        });

        // 6. Plans de maintenance préventive & étalonnage (CDC 3.3)
        Schema::create('maintenance_plans', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('equipment_id')->constrained('equipments')->cascadeOnDelete();
            $table->string('maintenance_type')->default('preventive'); // preventive, etalonnage, qualification, curative
            $table->unsignedInteger('frequency_days')->default(90); // ex: 30, 90, 180, 365
            $table->date('last_performed_at')->nullable();
            $table->date('next_due_date');
            $table->string('default_provider_name')->nullable();
            $table->text('instructions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'next_due_date']);
        });

        // 7. Événements et interventions de maintenance (CDC 3.3 & 7)
        Schema::create('maintenance_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('equipment_id')->constrained('equipments')->cascadeOnDelete();
            $table->foreignId('maintenance_plan_id')->nullable()->constrained('maintenance_plans')->nullOnDelete();
            $table->string('intervention_type'); // preventive, curative, etalonnage
            $table->date('intervention_date');
            $table->string('provider_name')->nullable();
            $table->string('technician_name')->nullable();
            $table->text('description');
            $table->string('result')->default('conforme'); // conforme, non_conforme, a_surveiller
            $table->date('next_due_date')->nullable();
            $table->decimal('cost', 10, 2)->nullable();
            $table->unsignedBigInteger('report_document_id')->nullable();
            $table->boolean('is_verified')->default(false); // CDC 7: Une intervention non vérifiée reste distincte
            $table->foreignId('verified_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->unsignedBigInteger('created_action_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'equipment_id']);
            $table->index(['officine_id', 'is_verified']);
        });

        // 8. Tests périodiques du groupe électrogène (CDC 3.4)
        Schema::create('generator_tests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('equipment_id')->constrained('equipments')->cascadeOnDelete();
            $table->date('test_date');
            $table->foreignId('tested_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('fuel_level_percent', 5, 2); // 0.00 à 100.00
            $table->unsignedSmallInteger('start_delay_seconds')->default(5);
            $table->boolean('oil_level_ok')->default(true);
            $table->boolean('battery_voltage_ok')->default(true);
            $table->decimal('frequency_hz', 5, 2)->nullable(); // ex: 50.0 Hz
            $table->string('test_result')->default('conforme'); // conforme, echec, reserve
            $table->text('comment')->nullable();
            $table->unsignedBigInteger('created_action_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'test_date']);
        });

        // 9. Plans et protocoles de nettoyage des zones (CDC 3.5)
        Schema::create('cleaning_plans', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('zone_name');
            $table->string('frequency')->default('quotidien'); // quotidien, hebdomadaire, bimensuel, mensuel
            $table->text('cleaning_method');
            $table->string('products_used')->nullable();
            $table->string('assigned_role')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'is_active']);
        });

        // 10. Occurrences et enregistrements de nettoyage (CDC 3.5)
        Schema::create('cleaning_occurrences', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('cleaning_plan_id')->constrained('cleaning_plans')->cascadeOnDelete();
            $table->date('planned_date');
            $table->timestamp('performed_at')->nullable();
            $table->foreignId('performed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('non_realise'); // realise, non_realise, en_retard
            $table->boolean('is_verified')->default(false);
            $table->foreignId('verified_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('anomalies_detected')->nullable();
            $table->unsignedBigInteger('created_action_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'planned_date']);
        });

        // 11. Fiches de retrait et mise hors service d'équipement (CDC 3.6 & 7)
        Schema::create('equipment_withdrawals', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('equipment_id')->constrained('equipments')->cascadeOnDelete();
            $table->date('request_date');
            $table->foreignId('requested_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->text('withdrawal_reason');
            $table->string('destination')->default('reforme'); // reforme, destruction, retour_fournisseur, stockage_mort
            $table->string('status')->default('demande'); // demande, approuve, rejete
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_withdrawals');
        Schema::dropIfExists('cleaning_occurrences');
        Schema::dropIfExists('cleaning_plans');
        Schema::dropIfExists('generator_tests');
        Schema::dropIfExists('maintenance_events');
        Schema::dropIfExists('maintenance_plans');
        Schema::dropIfExists('commissioning_tests');
        Schema::dropIfExists('equipment_location_histories');
        Schema::dropIfExists('equipments');
        Schema::dropIfExists('equipment_locations');
    }
};

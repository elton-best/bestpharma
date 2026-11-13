<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cdc_stupefiants_entries', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('officine_id')->index();
            $table->date('entry_date');
            $table->string('movement_type', 20); // entree, sortie, destruction
            $table->string('substance_name', 150);
            $table->string('lot_number', 80);
            $table->decimal('quantity', 12, 2);
            $table->string('unit', 30)->default('Unité');
            $table->string('prescription_ref', 80)->nullable();
            $table->string('patient_name', 150)->nullable();
            $table->string('prescriber_name', 150)->nullable();
            $table->string('pharmacist_visa', 120)->nullable();
            $table->string('entry_hash', 64);
            $table->timestamps();
        });

        Schema::create('cdc_preparations', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('officine_id')->index();
            $table->string('reference', 60);
            $table->string('formula_name', 180);
            $table->string('patient_name', 150)->nullable();
            $table->string('prescriber_name', 150)->nullable();
            $table->json('ingredients')->nullable();
            $table->string('quantity_prepared', 60);
            $table->date('expiry_date');
            $table->string('status', 30)->default('en_preparation'); // en_preparation, controle_pharmacien, delivree
            $table->string('control_hash', 64)->nullable();
            $table->timestamp('controlled_at')->nullable();
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
        });

        Schema::create('cdc_bpd_templates', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('officine_id')->index();
            $table->string('code', 20);
            $table->string('title', 200);
            $table->string('category', 80);
            $table->string('bpd_reference', 80);
            $table->boolean('is_adopted')->default(false);
            $table->timestamp('adopted_at')->nullable();
            $table->timestamps();

            $table->unique(['officine_id', 'code']);
        });

        Schema::create('cdc_autoeval_campaigns', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('officine_id')->index();
            $table->string('reference', 60);
            $table->string('title', 180);
            $table->unsignedInteger('total_articles')->default(267);
            $table->unsignedInteger('compliant_count')->default(0);
            $table->unsignedInteger('non_compliant_count')->default(0);
            $table->decimal('score_percent', 5, 2)->default(0);
            $table->string('status', 20)->default('en_cours'); // en_cours, cloturee
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
        });

        Schema::create('cdc_presence_logs', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('officine_id')->index();
            $table->unsignedBigInteger('employee_id')->nullable()->index();
            $table->string('staff_name', 150);
            $table->string('role_badge', 80);
            $table->date('work_date');
            $table->string('check_in_at', 10);
            $table->string('check_out_at', 10)->nullable();
            $table->boolean('pharmacist_present')->default(true);
            $table->string('notes', 255)->nullable();
            $table->timestamps();
        });

        Schema::create('cdc_regulatory_deadlines', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('officine_id')->index();
            $table->string('reference', 60);
            $table->string('title', 180);
            $table->string('authority', 60); // ABRP, DGI, CNSS, Ordre, Inspection
            $table->date('due_date');
            $table->string('status', 20)->default('a_venir'); // a_venir, en_cours, cloturee
            $table->string('proof_ref', 120)->nullable();
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cdc_regulatory_deadlines');
        Schema::dropIfExists('cdc_presence_logs');
        Schema::dropIfExists('cdc_autoeval_campaigns');
        Schema::dropIfExists('cdc_bpd_templates');
        Schema::dropIfExists('cdc_preparations');
        Schema::dropIfExists('cdc_stupefiants_entries');
    }
};

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
            foreach (['reporting', 'dashboard'] as $mod) {
                DB::table('officine_modules')->updateOrInsert(
                    ['officine_id' => $id, 'module' => $mod],
                    ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]
                );
            }
        }

        // 1. Définitions d'indicateurs documentées (CDC 3.2 & 5)
        Schema::create('metric_definitions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('code');
            $table->string('module_key'); // qualite, stock, achats, dispensation, tresorerie, locauxequipements
            $table->string('title');
            $table->text('definition');
            $table->string('numerator_label');
            $table->string('denominator_label')->nullable();
            $table->string('unit')->default('%'); // %, unite, FCFA
            $table->string('required_permission')->default('reporting.read');
            $table->boolean('is_validated')->default(true);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'code']);
        });

        // 2. Modèles de rapports & planification (CDC 3.4 & 3.5)
        Schema::create('report_templates', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('code');
            $table->string('title');
            $table->string('category')->default('smq_bpd'); // smq_bpd, stock_fefo, ventes_caisse, fournisseurs, locaux
            $table->text('description')->nullable();
            $table->json('metric_codes');
            $table->string('default_format')->default('csv'); // csv, pdf, json
            $table->boolean('is_scheduled')->default(false);
            $table->string('cron_schedule')->nullable();
            $table->boolean('consent_confirmed')->default(false); // CDC 3.5 : consentement métier établi
            $table->json('recipients')->nullable(); // [user_id, ...]
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'code']);
        });

        // 3. Préférences tableau de bord utilisateur (CDC 3.1)
        Schema::create('dashboard_preferences', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('default_period')->default('30d'); // 7d, 30d, 90d, ytd
            $table->json('pinned_modules')->nullable();
            $table->json('pinned_metric_codes')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'user_id']);
        });

        // 4. Exécutions & Calculs datés de rapports (CDC 3.2 & 3.3)
        Schema::create('report_runs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('template_id')->nullable()->constrained('report_templates')->nullOnDelete();
            $table->string('reference');
            $table->string('title');
            $table->date('period_start');
            $table->date('period_end');
            $table->date('comparison_period_start')->nullable();
            $table->date('comparison_period_end')->nullable();
            $table->json('filters')->nullable();
            $table->json('computed_metrics');
            $table->string('status')->default('termine'); // termine, echec
            $table->foreignId('generated_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('generated_at');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'generated_at']);
        });

        // 5. Trace des exports générés (CDC 3.4 & 7)
        Schema::create('report_exports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('report_run_id')->constrained('report_runs')->cascadeOnDelete();
            $table->string('export_ref');
            $table->string('format'); // csv, pdf, json
            $table->unsignedInteger('row_count')->default(0);
            $table->boolean('filtered_sensitive_fields')->default(true);
            $table->string('file_checksum_sha256', 64);
            $table->foreignId('exported_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('exported_at');
            $table->timestamps();

            $table->unique(['officine_id', 'export_ref']);
        });

        // 6. Jobs de notification & diffusion (CDC 3.5 & 5)
        Schema::create('notification_jobs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('template_id')->nullable()->constrained('report_templates')->nullOnDelete();
            $table->foreignId('report_run_id')->nullable()->constrained('report_runs')->nullOnDelete();
            $table->foreignId('recipient_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('channel')->default('interne'); // interne, email
            $table->string('status')->default('planifie'); // planifie, envoye, echec
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->text('last_error')->nullable();
            $table->timestamp('scheduled_for');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['officine_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_jobs');
        Schema::dropIfExists('report_exports');
        Schema::dropIfExists('report_runs');
        Schema::dropIfExists('dashboard_preferences');
        Schema::dropIfExists('report_templates');
        Schema::dropIfExists('metric_definitions');
    }
};

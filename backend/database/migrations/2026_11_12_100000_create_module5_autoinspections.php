<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Programmes d'auto-inspection (pluriannuels ou annuels)
        Schema::create('inspection_programs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->restrictOnDelete();
            $table->string('title', 180);
            $table->unsignedSmallInteger('year_start');
            $table->unsignedSmallInteger('year_end');
            $table->text('objective');
            $table->string('status', 24)->default('active');
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->index(['officine_id', 'status', 'year_start']);
        });

        // 2. Sessions d'auto-inspection
        Schema::create('inspections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->restrictOnDelete();
            $table->foreignId('program_id')->nullable()->constrained('inspection_programs')->nullOnDelete();
            $table->string('reference', 40);
            $table->string('title', 180);
            $table->string('process_scope', 100); // e.g. "Dispensation", "Locaux et Équipements", "Personnel"
            $table->text('scope_description')->nullable();
            $table->text('objective');
            $table->date('planned_date');
            $table->date('realized_date')->nullable();
            $table->foreignId('lead_inspector_id')->constrained('users')->restrictOnDelete();
            $table->string('status', 24)->default('draft'); // draft, planned, in_progress, completed, approved, closed
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'status', 'planned_date']);
        });

        // 3. Inspecteurs affectés et vérification d'indépendance
        Schema::create('inspection_inspectors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inspection_id')->constrained('inspections')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('role', 24)->default('inspector'); // lead, inspector, observer
            $table->string('regular_service', 100)->nullable();
            $table->boolean('conflict_check_passed')->default(true);
            $table->text('conflict_notes')->nullable();
            $table->timestamps();
            $table->unique(['inspection_id', 'user_id']);
        });

        // 4. Questions et grille d'évaluation BPD
        Schema::create('inspection_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inspection_id')->constrained('inspections')->cascadeOnDelete();
            $table->string('bpd_reference', 50)->nullable();
            $table->string('chapter', 100);
            $table->text('requirement');
            $table->text('guidance')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index(['inspection_id', 'chapter', 'sort_order']);
        });

        // 5. Réponses, constats et preuves terrain
        Schema::create('inspection_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inspection_id')->constrained('inspections')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('inspection_items')->cascadeOnDelete();
            $table->string('status', 24)->default('non_evalue'); // conforme, non_conforme, non_applicable, non_evalue
            $table->text('observed_facts')->nullable();
            $table->text('evidence_notes')->nullable();
            $table->string('finding_type', 24)->default('none'); // none, strength, weakness, non_conformity
            $table->foreignId('evaluated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('evaluated_at')->nullable();
            $table->timestamps();
            $table->unique(['inspection_id', 'item_id']);
        });

        // 6. Rapports formels d'inspection scellés
        Schema::create('inspection_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inspection_id')->constrained('inspections')->cascadeOnDelete();
            $table->string('reference', 50);
            $table->text('methodology');
            $table->text('summary_findings');
            $table->text('strengths')->nullable();
            $table->text('weaknesses')->nullable();
            $table->text('conclusions');
            $table->text('recommendations');
            $table->string('status', 24)->default('draft'); // draft, submitted, approved, rejected
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->string('sha256_hash', 64)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
            $table->unique(['inspection_id']);
        });

        // 7. Évaluation des inspecteurs
        Schema::create('inspector_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inspection_id')->constrained('inspections')->cascadeOnDelete();
            $table->foreignId('inspector_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('evaluator_id')->constrained('users')->restrictOnDelete();
            $table->unsignedTinyInteger('methodology_score')->default(5);
            $table->unsignedTinyInteger('objectivity_score')->default(5);
            $table->unsignedTinyInteger('reporting_score')->default(5);
            $table->text('comments')->nullable();
            $table->timestamps();
            $table->unique(['inspection_id', 'inspector_id']);
        });

        // 8. Liens avec les actions Module 04
        Schema::create('inspection_action_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inspection_id')->constrained('inspections')->cascadeOnDelete();
            $table->foreignId('response_id')->nullable()->constrained('inspection_responses')->nullOnDelete();
            $table->foreignId('action_id')->constrained('module4_actions')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['inspection_id', 'action_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inspection_action_links');
        Schema::dropIfExists('inspector_evaluations');
        Schema::dropIfExists('inspection_reports');
        Schema::dropIfExists('inspection_responses');
        Schema::dropIfExists('inspection_items');
        Schema::dropIfExists('inspection_inspectors');
        Schema::dropIfExists('inspections');
        Schema::dropIfExists('inspection_programs');
    }
};

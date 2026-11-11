<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Registre des Risques & Opportunités
        Schema::create('risks_and_opportunities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('reference', 64)->index();
            $table->string('type', 32)->default('risk'); // risk, opportunity
            $table->string('process_scope', 64); // Locaux & Matériel, Dispensation, Approvisionnement, Personnel, Chaine du froid, etc.
            $table->string('title', 180);
            $table->text('description');
            $table->text('causes')->nullable();
            $table->text('consequences')->nullable();
            $table->foreignId('owner_id')->constrained('users')->restrictOnDelete();
            $table->string('status', 32)->default('identified'); // identified, evaluated, mitigated, accepted, closed
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'type', 'status']);
        });

        // 2. Évaluations de criticité (Initiales brutes vs Résiduelles nettes) - CDC 3.2 & 3.4
        Schema::create('risk_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('risk_id')->constrained('risks_and_opportunities')->cascadeOnDelete();
            $table->string('assessment_type', 32)->default('initial'); // initial, residual
            $table->unsignedTinyInteger('probability'); // 1 à 4
            $table->unsignedTinyInteger('impact'); // 1 à 4 (gravité pour risque, pertinence pour opportunité)
            $table->unsignedSmallInteger('score'); // probabilité * impact (1 à 16)
            $table->string('criticality_level', 32); // faible (1-4), modéré (5-8), élevé (9-12), critique (13-16)
            $table->string('grid_version', 16)->default('1.0');
            $table->text('rationale')->nullable(); // Justification de la cotation
            $table->foreignId('evaluated_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('evaluated_at');
            $table->timestamps();

            $table->index(['risk_id', 'assessment_type']);
        });

        // 3. Liaisons directes avec le registre d'actions CAPA (Module 04)
        Schema::create('risk_action_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('risk_id')->constrained('risks_and_opportunities')->cascadeOnDelete();
            $table->foreignId('action_id')->constrained('module4_actions')->cascadeOnDelete();
            $table->string('mitigation_strategy', 32)->default('reduce'); // reduce, avoid, transfer, accept
            $table->timestamps();
        });

        // 4. Scénarios du Plan de Continuité d'Activité (PCA) - CDC 3.5
        Schema::create('continuity_scenarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('reference', 64)->index();
            $table->string('title', 180);
            $table->string('threat_type', 64); // coupure_energie, rupture_stock, sinistre_inondation, panne_informatique, indisponibilite_personnel, autre
            $table->text('trigger_events'); // Déclencheurs / seuils d'alerte
            $table->text('immediate_actions'); // Mesures réflexes d'urgence
            $table->text('alternative_operations'); // Mode dégradé / secours
            $table->unsignedSmallInteger('rto_hours')->default(4); // Recovery Time Objective (délai max d'interruption admissible en heures)
            $table->foreignId('coordinator_id')->constrained('users')->restrictOnDelete();
            $table->json('crisis_contacts')->nullable(); // Contacts d'urgence (secours, prestataires, astreinte)
            $table->string('status', 32)->default('active'); // draft, active, under_revision, archived
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'threat_type', 'status']);
        });

        // 5. Exercices et tests périodiques du PCA - CDC 3.5
        Schema::create('continuity_exercises', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scenario_id')->constrained('continuity_scenarios')->cascadeOnDelete();
            $table->string('title', 180);
            $table->string('test_type', 32)->default('simulation'); // simulation, reel, revue_sur_table
            $table->date('exercise_date');
            $table->foreignId('conducted_by')->constrained('users')->restrictOnDelete();
            $table->unsignedSmallInteger('measured_recovery_minutes')->nullable();
            $table->boolean('is_successful')->default(true);
            $table->text('findings')->nullable();
            $table->text('improvement_points')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('continuity_exercises');
        Schema::dropIfExists('continuity_scenarios');
        Schema::dropIfExists('risk_action_links');
        Schema::dropIfExists('risk_assessments');
        Schema::dropIfExists('risks_and_opportunities');
    }
};

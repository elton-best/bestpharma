<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Réclamations (patients, clients, fournisseurs)
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('reference', 64)->index();
            $table->string('channel', 32)->default('comptoir'); // comptoir, telephone, email, courrier, autre
            $table->string('complainant_type', 32)->default('patient'); // patient, fournisseur, prescripteur, autre
            $table->string('complainant_name', 160)->nullable();
            $table->string('complainant_contact', 160)->nullable();
            $table->boolean('is_anonymous')->default(false);
            $table->string('category', 64)->default('dispensation'); // dispensation, produit_defectueux, facturation, accueil_service, retard_livraison, autre
            $table->string('title', 180);
            $table->text('description');
            $table->text('desired_solution')->nullable();
            $table->date('received_date');
            $table->string('status', 32)->default('received'); // received, under_review, action_required, resolved, closed, rejected
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'status', 'received_date']);
        });

        // 2. Réponses et traitement apportés aux réclamations
        Schema::create('complaint_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complaint_id')->constrained('complaints')->cascadeOnDelete();
            $table->string('response_channel', 32)->default('oral_comptoir');
            $table->text('response_content');
            $table->string('decision_type', 32)->default('favorable'); // favorable, partielle, defavorable, sans_suite
            $table->timestamp('communicated_at')->nullable();
            $table->foreignId('communicated_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        // 3. Fiches de Non-conformité et Écarts
        Schema::create('nonconformities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('reference', 64)->index();
            $table->string('source_type', 48)->default('internal_detection'); // internal_detection, complaint, audit_inspection, supplier_delivery, temperature_deviation, other
            $table->foreignId('complaint_id')->nullable()->constrained('complaints')->nullOnDelete();
            $table->string('activity_domain', 64)->default('dispensation'); // stockage, dispensation, approvisionnement, chaine_du_froid, hygiene_locaux, stupefiants, organisation_qualite
            $table->string('title', 180);
            $table->text('description');
            $table->date('detection_date');
            $table->foreignId('detected_by')->constrained('users')->restrictOnDelete();
            $table->string('nature', 32)->default('non_conformite'); // ecart, non_conformite
            $table->string('severity', 32)->default('mineure'); // mineure, majeure, critique
            $table->text('immediate_actions')->nullable(); // Mesures d'urgence conservatoires
            $table->string('status', 32)->default('declared'); // declared, analyzed, action_in_progress, effectiveness_review, closed
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'status', 'detection_date']);
            $table->index(['officine_id', 'severity']);
        });

        // 4. Analyse des causes racines (5 Pourquoi / 5M Ishikawa)
        Schema::create('nc_root_causes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nonconformity_id')->constrained('nonconformities')->cascadeOnDelete();
            $table->string('method', 32)->default('5_why'); // 5_why, 5m_ishikawa, other
            $table->text('why_1')->nullable();
            $table->text('why_2')->nullable();
            $table->text('why_3')->nullable();
            $table->text('why_4')->nullable();
            $table->text('why_5')->nullable();
            $table->text('main_cause');
            $table->foreignId('analyzed_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('analyzed_at');
            $table->timestamps();
        });

        // 5. Liaisons directes avec le registre d'actions CAPA (Module 04)
        Schema::create('nc_action_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nonconformity_id')->nullable()->constrained('nonconformities')->cascadeOnDelete();
            $table->foreignId('complaint_id')->nullable()->constrained('complaints')->cascadeOnDelete();
            $table->foreignId('action_id')->constrained('module4_actions')->cascadeOnDelete();
            $table->timestamps();
        });

        // 6. Revue d'efficacité et validation de clôture (CDC 3.5 & 7)
        Schema::create('nc_effectiveness_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nonconformity_id')->nullable()->constrained('nonconformities')->cascadeOnDelete();
            $table->foreignId('complaint_id')->nullable()->constrained('complaints')->cascadeOnDelete();
            $table->text('criteria_evaluated');
            $table->boolean('is_effective')->default(false);
            $table->text('observations')->nullable();
            $table->string('decision', 32)->default('approve_closure'); // approve_closure, require_additional_actions
            $table->foreignId('reviewed_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('reviewed_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nc_effectiveness_reviews');
        Schema::dropIfExists('nc_action_links');
        Schema::dropIfExists('nc_root_causes');
        Schema::dropIfExists('nonconformities');
        Schema::dropIfExists('complaint_responses');
        Schema::dropIfExists('complaints');
    }
};

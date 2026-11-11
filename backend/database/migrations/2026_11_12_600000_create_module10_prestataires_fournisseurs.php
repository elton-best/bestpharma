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
        // 1. Activer le module achats pour toutes les officines
        $officineIds = DB::table('officines')->pluck('id');
        foreach ($officineIds as $id) {
            DB::table('officine_modules')->updateOrInsert(
                ['officine_id' => $id, 'module' => 'achats'],
                ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        // 2. Fournisseurs & Prestataires (CDC 3.1)
        Schema::create('suppliers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('code');
            $table->string('name');
            $table->string('type')->default('grossiste'); // grossiste, fabricant, prestataire_service, transporteur, maintenance, autre
            $table->string('category')->default('produits_sante'); // produits_sante, chaine_froid, securite, locaux, informatique, divers
            $table->string('ifu')->nullable();
            $table->string('rccm')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('country')->default('Bénin');
            $table->string('status')->default('actif'); // actif, a_evaluer, qualifie, suspendu, radie
            $table->decimal('average_rating', 3, 2)->default(0.00);
            $table->text('notes')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'code']);
            $table->index(['officine_id', 'status']);
            $table->index(['officine_id', 'type']);
        });

        // 3. Contacts Fournisseurs (CDC 3.1)
        Schema::create('supplier_contacts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->string('name');
            $table->string('role_title')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->index(['officine_id', 'supplier_id']);
        });

        // 4. Documents & Preuves Fournisseurs (CDC 3.1 & 4)
        Schema::create('supplier_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->string('document_type'); // agregation_abmed, certificat_bpd, rccm_ifu, contrat_sla, attestation_assurance, autre
            $table->string('title');
            $table->string('document_ref')->nullable();
            $table->date('valid_until')->nullable();
            $table->string('file_path')->nullable();
            $table->boolean('is_valid')->default(true);
            $table->timestamps();

            $table->index(['officine_id', 'supplier_id']);
        });

        // 5. Sélections et Appels d'Offres (CDC 3.2 & 7)
        Schema::create('supplier_selections', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('reference');
            $table->string('title');
            $table->text('need_description');
            $table->json('selection_criteria')->nullable(); // [{criterion, weight, target}]
            $table->string('status')->default('brouillon'); // brouillon, comparaison, valide, rejete, annule
            $table->foreignId('selected_supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->text('selection_justification')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('validated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('validated_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'status']);
        });

        // 6. Devis et Offres comparées (CDC 3.2)
        Schema::create('supplier_quotes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('selection_id')->constrained('supplier_selections')->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->unsignedSmallInteger('delivery_days')->nullable();
            $table->decimal('technical_score', 5, 2)->default(0.00);
            $table->decimal('financial_score', 5, 2)->default(0.00);
            $table->decimal('total_score', 5, 2)->default(0.00);
            $table->boolean('is_retained')->default(false);
            $table->text('comments')->nullable();
            $table->timestamps();

            $table->index(['officine_id', 'selection_id']);
        });

        // 7. Modèles et Grilles d'évaluation (CDC 3.3)
        Schema::create('supplier_evaluation_templates', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('code');
            $table->string('title');
            $table->string('supplier_type')->default('grossiste');
            $table->json('criteria'); // [{key, label, weight, max_score}]
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'code']);
        });

        // 8. Évaluations périodiques et Satisfaction (CDC 3.3)
        Schema::create('supplier_evaluations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignId('template_id')->nullable()->constrained('supplier_evaluation_templates')->nullOnDelete();
            $table->string('period'); // ex: 2026-T1, 2026-Annuel
            $table->date('evaluation_date');
            $table->foreignId('evaluator_user_id')->constrained('users')->cascadeOnDelete();
            $table->json('criteria_scores'); // [{key, label, score_1_to_5, comment}]
            $table->decimal('overall_score_on_5', 3, 2);
            $table->decimal('percentage_score', 5, 2);
            $table->string('decision')->default('qualifie'); // qualifie, sous_reserve, non_reconduit, a_ameliorer
            $table->text('strengths')->nullable();
            $table->text('weaknesses')->nullable();
            $table->text('action_required')->nullable();
            $table->unsignedBigInteger('created_action_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'supplier_id']);
            $table->index(['officine_id', 'decision']);
        });

        // 9. Réclamations & Litiges Fournisseurs (CDC 3.4)
        Schema::create('supplier_complaints', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->string('reference');
            $table->string('claim_type'); // livraison_non_conforme, retard_critique, produit_endommage, ecart_facturation, rupture_brutale, autre
            $table->date('claim_date');
            $table->string('order_reference')->nullable();
            $table->string('delivery_note_ref')->nullable();
            $table->text('description');
            $table->string('status')->default('ouvert'); // ouvert, transmis, reponse_recue, avoir_emis, resolu, cloture
            $table->text('supplier_response')->nullable();
            $table->date('response_received_at')->nullable();
            $table->decimal('refund_or_credit_amount', 12, 2)->default(0.00);
            $table->unsignedBigInteger('created_action_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'status']);
        });

        // 10. Contrats et Suivi des Échéances (CDC 3.5)
        Schema::create('supplier_contracts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->string('contract_ref');
            $table->string('title');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('auto_renewal')->default(true);
            $table->unsignedSmallInteger('notice_days')->default(60);
            $table->string('status')->default('actif'); // actif, a_renouveler, resilie, expire
            $table->text('terms_summary')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_contracts');
        Schema::dropIfExists('supplier_complaints');
        Schema::dropIfExists('supplier_evaluations');
        Schema::dropIfExists('supplier_evaluation_templates');
        Schema::dropIfExists('supplier_quotes');
        Schema::dropIfExists('supplier_selections');
        Schema::dropIfExists('supplier_documents');
        Schema::dropIfExists('supplier_contacts');
        Schema::dropIfExists('suppliers');
    }
};

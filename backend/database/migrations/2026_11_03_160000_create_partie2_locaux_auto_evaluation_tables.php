<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. RELEVÉS DE TEMPÉRATURE & HYGROMÉTRIE (BPD4-F04 & BPD4-F05)
        Schema::create('releves_temperature', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('zone'); // refrigeree_2_8, magasin_reserve, hall_dispensation
            $table->decimal('temperature', 4, 2);
            $table->decimal('temp_min', 4, 2)->nullable();
            $table->decimal('temp_max', 4, 2)->nullable();
            $table->decimal('humidite', 4, 1)->nullable();
            $table->string('moment'); // matin, soir
            $table->date('date_releve');
            $table->time('heure_releve');
            $table->string('statut_conformite')->default('conforme'); // conforme, excursion_haute, excursion_basse
            $table->foreignUuid('agent_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('non_conformite_id')->nullable()->constrained('non_conformites')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['officine_id', 'date_releve', 'zone']);
        });

        // 2. ÉQUIPEMENTS DE L'OFFICINE & CARNET DE VIE (BPD4-F01 à F03)
        Schema::create('equipements_officine', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('code_interne'); // FRIG-01, CLIM-01, BAL-01, OND-01...
            $table->string('designation');
            $table->string('categorie'); // refrigerateur, climatiseur, onduleur_groupe, balance_precision, enregistreur_temperature, autre
            $table->string('marque_modele')->nullable();
            $table->string('numero_serie')->nullable();
            $table->string('emplacement')->nullable();
            $table->date('date_acquisition')->nullable();
            $table->integer('periodicite_etalonnage_mois')->default(12);
            $table->date('date_dernier_etalonnage')->nullable();
            $table->date('date_prochain_etalonnage')->nullable();
            $table->string('statut')->default('conforme'); // conforme, a_etalonner, en_panne
            $table->string('certificat_ref')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['officine_id', 'statut']);
        });

        // 3. REGISTRE DE NETTOYAGE & BIO-NETTOYAGE (BPD4-F07)
        Schema::create('nettoyage_registre', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('zone'); // comptoir, reserve, preparatoire, sanitaires_vestiaires, exterieur
            $table->string('frequence')->default('quotidien'); // quotidien, hebdomadaire, mensuel
            $table->string('produit_utilise')->nullable();
            $table->foreignUuid('agent_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('date_heure');
            $table->boolean('conforme')->default(true);
            $table->foreignUuid('visa_responsable')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['officine_id', 'date_heure']);
        });

        // 4. CAMPAGNES D'AUTO-ÉVALUATION BPD (BPD10-F01 à F03 & 4.0.1)
        Schema::create('campagnes_auto_evaluation', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('titre');
            $table->integer('annee');
            $table->date('date_debut');
            $table->date('date_cloture')->nullable();
            $table->foreignUuid('auditeur_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('statut')->default('en_cours'); // en_cours, cloturee
            $table->decimal('score_global', 5, 2)->default(0);
            $table->text('synthese')->nullable();
            $table->timestamps();

            $table->index(['officine_id', 'statut']);
        });

        // 5. ÉVALUATIONS DÉTAILLÉES PAR ARTICLE DU GUIDE BPD (267 articles)
        Schema::create('evaluations_articles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('campagne_id')->constrained('campagnes_auto_evaluation')->cascadeOnDelete();
            $table->foreignUuid('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->integer('chapitre_numero');
            $table->string('chapitre_titre');
            $table->string('article_numero'); // ex: "1.1", "4.18", "5.20"
            $table->text('article_libelle');
            $table->string('processus')->default('QAM'); // TAM, QAM, GAD, GAC, GAR
            $table->string('cotation')->default('non_evalue'); // non_evalue, conforme, ecart_mineur, ecart_majeur, non_applicable
            $table->text('preuve')->nullable();
            $table->text('commentaire')->nullable();
            $table->foreignUuid('non_conformite_id')->nullable()->constrained('non_conformites')->nullOnDelete();
            $table->foreignUuid('responsable_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('date_evaluation')->nullable();
            $table->timestamps();

            $table->index(['campagne_id', 'chapitre_numero']);
            $table->index(['campagne_id', 'article_numero']);
            $table->index(['officine_id', 'cotation']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluations_articles');
        Schema::dropIfExists('campagnes_auto_evaluation');
        Schema::dropIfExists('nettoyage_registre');
        Schema::dropIfExists('equipements_officine');
        Schema::dropIfExists('releves_temperature');
    }
};

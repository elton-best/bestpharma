<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Table des 59 modèles types BPD de l'ABMed / BEG
        Schema::create('modeles_bpd', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code_ref', 50)->unique(); // Ex: TAM-DO-001, GAC-EN-004
            $table->string('processus', 20); // TAM, QAM, GAD, GAC, GAR
            $table->string('type_document', 20); // PR, MO, EN, FI, PL, LI, RA, DO
            $table->string('titre');
            $table->text('objet')->nullable();
            $table->text('domaine_application')->nullable();
            $table->text('contenu_modele');
            $table->string('articles_guide', 255)->nullable(); // Ex: art. 1.3, 1.4, 3.10
            $table->integer('duree_conservation_ans')->default(5);
            $table->timestamps();
        });

        // 2. Table des inscriptions à l'Ordre National des Pharmaciens (BPD2-F04)
        Schema::create('inscriptions_ordre', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('numero_ordre', 50);
            $table->string('section_ordre', 20)->default('B'); // Section B pour officine
            $table->date('date_inscription');
            $table->date('date_echeance');
            $table->boolean('en_regle')->default(true);
            $table->string('justificatif_url')->nullable();
            $table->timestamps();
        });

        // 3. Enrichissement des fiches employés (matrice de compétences, badge, habilitations)
        Schema::table('employes', function (Blueprint $table) {
            $table->string('matricule', 50)->nullable();
            $table->string('code_badge', 100)->nullable()->unique();
            $table->string('pin_code', 10)->nullable(); // Pour pointage rapide au comptoir
            $table->jsonb('habilitations')->nullable(); // Liste des fonctions autorisées
            $table->jsonb('competences')->nullable(); // Matrice des compétences acquises
            $table->date('date_visite_medicale')->nullable();
            $table->boolean('charte_qualite_signee')->default(false);
            $table->timestamp('charte_signee_le')->nullable();
        });

        // 4. Enrichissement des documents GED (codification, signatures, révisions)
        Schema::table('documents', function (Blueprint $table) {
            $table->string('code_document', 50)->nullable(); // Ex: GAC-PR-001
            $table->string('type_doc', 20)->default('procedure'); // procedure, mode_operatoire, registre, fiche, etc.
            $table->string('processus', 20)->default('QAM'); // TAM, QAM, GAD, GAC, GAR
            $table->integer('indice_revision')->default(0);
            $table->string('redacteur_nom')->nullable();
            $table->string('approbateur_nom')->nullable();
            $table->timestamp('approuve_le')->nullable();
            $table->date('prochaine_revision')->nullable();
            $table->text('motif_refus')->nullable();
            $table->uuid('modele_source_id')->nullable();
        });

        // 5. Enrichissement des non-conformités (causes 5M, plan CAPA, vérification d'efficacité)
        Schema::table('non_conformites', function (Blueprint $table) {
            $table->string('numero_nc', 50)->nullable(); // Ex: NC-2026-001
            $table->string('processus', 20)->default('QAM');
            $table->string('source', 50)->default('interne'); // interne, reclamation_client, livraison, temperature, audit
            $table->text('analyse_causes_5m')->nullable(); // Méthode 5M / 5 pourquoi
            $table->text('action_immediate')->nullable();
            $table->text('action_preventive')->nullable();
            $table->date('date_echeance_capa')->nullable();
            $table->string('responsable_action')->nullable();
            $table->boolean('efficacite_verifiee')->default(false);
            $table->text('conclusion_efficacite')->nullable();
            $table->timestamp('cloturee_le')->nullable();
            $table->uuid('cloturee_par')->nullable();
        });

        // RLS sur inscriptions_ordre
        DB::unprepared("ALTER TABLE inscriptions_ordre ENABLE ROW LEVEL SECURITY;");
        DB::unprepared("DROP POLICY IF EXISTS tenant_isolation_inscriptions_ordre ON inscriptions_ordre;");
        DB::unprepared("CREATE POLICY tenant_isolation_inscriptions_ordre ON inscriptions_ordre
            FOR ALL
            USING (
                current_setting('app.is_admin', true) = 'true'
                OR officine_id IN (SELECT user_officines())
            );");

        DB::unprepared("DROP TRIGGER IF EXISTS trg_audit_inscriptions_ordre ON inscriptions_ordre;");
        DB::unprepared("CREATE TRIGGER trg_audit_inscriptions_ordre
            AFTER INSERT OR UPDATE OR DELETE ON inscriptions_ordre
            FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared("DROP TRIGGER IF EXISTS trg_audit_inscriptions_ordre ON inscriptions_ordre;");
        DB::unprepared("DROP POLICY IF EXISTS tenant_isolation_inscriptions_ordre ON inscriptions_ordre;");
        Schema::dropIfExists('inscriptions_ordre');
        Schema::dropIfExists('modeles_bpd');

        Schema::table('employes', function (Blueprint $table) {
            $table->dropColumn(['matricule', 'code_badge', 'pin_code', 'habilitations', 'competences', 'date_visite_medicale', 'charte_qualite_signee', 'charte_signee_le']);
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['code_document', 'type_doc', 'processus', 'indice_revision', 'redacteur_nom', 'approbateur_nom', 'approuve_le', 'prochaine_revision', 'motif_refus', 'modele_source_id']);
        });

        Schema::table('non_conformites', function (Blueprint $table) {
            $table->dropColumn(['numero_nc', 'processus', 'source', 'analyse_causes_5m', 'action_immediate', 'action_preventive', 'date_echeance_capa', 'responsable_action', 'efficacite_verifiee', 'conclusion_efficacite', 'cloturee_le', 'cloturee_par']);
        });
    }
};

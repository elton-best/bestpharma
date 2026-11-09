<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for:
     * - Dossier Pharmaceutique Patient (DP)
     * - Répertoire des Prescripteurs
     * - Ordonnances Médicales & Archivage Légal (Guide BPD ABMed Chapitre 7)
     * - Liaison aux Dispensations et alertes cliniques
     */
    public function up(): void
    {
        // 1. Table Patients (Dossier Pharmaceutique)
        Schema::create('patients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->string('code_patient', 50);
            $table->string('nom', 100);
            $table->string('prenom', 100);
            $table->enum('sexe', ['M', 'F'])->default('M');
            $table->date('date_naissance');
            $table->integer('age')->nullable();
            $table->string('telephone', 50);
            $table->string('email', 150)->nullable();
            $table->text('adresse')->nullable();
            $table->string('ville', 100)->default('Cotonou');
            $table->string('groupe_sanguin', 10)->nullable(); // A+, O+, etc.
            $table->decimal('poids_kg', 5, 2)->nullable();
            $table->decimal('taille_cm', 5, 2)->nullable();
            $table->boolean('est_enceinte')->default(false);
            $table->boolean('est_allaitante')->default(false);
            $table->json('pathologies_chroniques')->nullable(); // Ex: ["Diabète type 2", "Hypertension"]
            $table->json('allergies_declarees')->nullable();     // Ex: ["Pénicillines", "Aspirine"]
            $table->text('notes_cliniques')->nullable();
            $table->boolean('consentement_dp')->default(true);
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->unique(['officine_id', 'code_patient']);
            $table->index(['officine_id', 'nom', 'prenom']);
            $table->index(['officine_id', 'telephone']);
        });

        // 2. Table Prescripteurs (Médecins, Sages-femmes, Dentistes)
        Schema::create('prescripteurs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->nullable()->index(); // Nullable si prescripteur partagé
            $table->string('nom_complet', 150);
            $table->string('titre', 50)->default('Dr');
            $table->string('specialite', 100)->nullable();
            $table->string('numero_ordre', 50)->nullable(); // Inscription Ordre des Médecins du Bénin
            $table->string('centre_sante', 150)->nullable(); // CNHU, CHD, Clinique...
            $table->string('telephone', 50)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('ville', 100)->default('Cotonou');
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->index(['nom_complet', 'specialite']);
        });

        // 3. Table Ordonnances Médicales
        Schema::create('ordonnances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->string('numero_ordonnance', 50);
            $table->uuid('patient_id')->index();
            $table->uuid('prescripteur_id')->nullable()->index();
            $table->string('prescripteur_nom_libre', 150)->nullable();
            $table->string('prescripteur_centre_libre', 150)->nullable();
            $table->date('date_prescription');
            $table->date('date_expiration')->nullable();
            $table->integer('duree_traitement_jours')->default(30);
            $table->integer('nombre_renouvellements_autorises')->default(0);
            $table->integer('nombre_renouvellements_effectues')->default(0);
            $table->enum('statut', ['active', 'cloturee', 'expiree', 'refusee'])->default('active');
            $table->string('scan_ordonnance_path', 255)->nullable();
            $table->string('scan_sha256', 64)->nullable(); // Empreinte cryptographique BPD-C03
            $table->text('diagnostic_presume')->nullable();
            $table->json('lignes_prescrites')->nullable();
            $table->text('commentaires_pharmacien')->nullable();
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('patient_id')->references('id')->on('patients')->cascadeOnDelete();
            $table->foreign('prescripteur_id')->references('id')->on('prescripteurs')->nullOnDelete();
            $table->unique(['officine_id', 'numero_ordonnance']);
            $table->index(['officine_id', 'date_prescription']);
        });

        // 4. Enrichissement table Dispensations
        Schema::table('dispensations', function (Blueprint $table) {
            $table->uuid('patient_id')->nullable()->index()->after('officine_id');
            $table->uuid('ordonnance_id')->nullable()->index()->after('patient_id');
            $table->uuid('prescripteur_id')->nullable()->index()->after('ordonnance_id');
            $table->json('alertes_detectees')->nullable()->after('commentaires_posologie');

            $table->foreign('patient_id')->references('id')->on('patients')->nullOnDelete();
            $table->foreign('ordonnance_id')->references('id')->on('ordonnances')->nullOnDelete();
            $table->foreign('prescripteur_id')->references('id')->on('prescripteurs')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dispensations', function (Blueprint $table) {
            $table->dropForeign(['patient_id']);
            $table->dropForeign(['ordonnance_id']);
            $table->dropForeign(['prescripteur_id']);
            $table->dropColumn(['patient_id', 'ordonnance_id', 'prescripteur_id', 'alertes_detectees']);
        });

        Schema::dropIfExists('ordonnances');
        Schema::dropIfExists('prescripteurs');
        Schema::dropIfExists('patients');
    }
};

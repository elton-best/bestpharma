<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Partie 3 :
     * - Catalogue produits officinaux (tableaux substances vénéneuses, thermolabile, etc.)
     * - Gestion des stocks par lots avec règle stricte FEFO (First Expired, First Out)
     * - Dispensations / Délivrances ordonnances & conseil
     * - Lignes de dispensation avec affectation précise des lots
     * - Registre officiel des Stupéfiants & Substances Vénéneuses (balance en temps réel inaltérable)
     * - Registre officiel des Préparations magistrales et officinales
     */
    public function up(): void
    {
        // 1. Catalogue Produits
        Schema::create('produits', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->nullable()->index(); // Nullable si référentiel national, ou lié à l'officine
            $table->string('code_cip', 30)->unique();
            $table->string('nom_commercial', 255);
            $table->string('dci', 255)->nullable();
            $table->string('forme', 100)->nullable(); // Comprimé, Sirop, Injectable, etc.
            $table->string('dosage', 100)->nullable(); // 500mg, 1g, etc.
            $table->string('classe_therapeutique', 150)->nullable();
            $table->enum('tableau_substance', ['sans', 'liste_1', 'liste_2', 'stupefiant'])->default('sans');
            $table->boolean('est_thermolabile')->default(false); // Nécessite 2°C-8°C
            $table->boolean('necessite_ordonnance')->default(false);
            $table->decimal('prix_achat_ht', 12, 2)->default(0);
            $table->decimal('prix_public_ttc', 12, 2)->default(0);
            $table->integer('seuil_stock_min')->default(5);
            $table->integer('seuil_stock_securite')->default(10);
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
        });

        // 2. Stocks par Lots (FEFO - First Expired, First Out)
        Schema::create('stocks_lots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->uuid('produit_id')->index();
            $table->string('numero_lot', 100);
            $table->date('date_fabrication')->nullable();
            $table->date('date_peremption'); // Clé de tri FEFO fondamentale (Art. BPD5-F08)
            $table->integer('quantite_initiale')->default(0);
            $table->integer('quantite_disponible')->default(0);
            $table->string('emplacement', 100)->default('Hall principal'); // Frigo 2-8°C, Armoire stupéfiants, Magasin
            $table->decimal('prix_achat_unitaire', 12, 2)->default(0);
            $table->string('fournisseur_nom', 200)->nullable(); // CAMEG, UBIPHARM, LABOREX, etc.
            $table->string('bon_livraison_ref', 100)->nullable();
            $table->enum('statut', ['en_stock', 'quarantaine', 'retire', 'epuise'])->default('en_stock');
            $table->text('motif_quarantaine')->nullable();
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('produit_id')->references('id')->on('produits')->cascadeOnDelete();
            $table->index(['officine_id', 'produit_id', 'date_peremption']); // Index composite critique FEFO
        });

        // 3. Dispensations (Ordonnances et Ventes au comptoir)
        Schema::create('dispensations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->string('numero_dispensation', 50)->unique(); // Ex: DISP-2026-0001
            $table->enum('type_dispensation', ['ordonnance', 'conseil_sans_ordonnance'])->default('ordonnance');
            $table->string('patient_nom', 150);
            $table->integer('patient_age')->nullable();
            $table->string('patient_telephone', 50)->nullable();
            $table->string('prescripteur_nom', 150)->nullable();
            $table->string('prescripteur_titre', 100)->nullable(); // Dr, Médecin, Sage-femme
            $table->string('prescripteur_centre', 150)->nullable(); // CNHU, Clinique, CHD
            $table->date('date_ordonnance')->nullable();
            $table->decimal('montant_total', 12, 2)->default(0);
            $table->enum('statut', ['validee', 'annulee'])->default('validee');
            $table->uuid('dispensateur_id')->index(); // Utilisateur ayant servi
            $table->uuid('pharmacien_id')->nullable()->index(); // Pharmacien ayant validé/visé
            $table->text('commentaires_posologie')->nullable();
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('dispensateur_id')->references('id')->on('users');
            $table->foreign('pharmacien_id')->references('id')->on('users');
        });

        // 4. Lignes de dispensation rattachées aux lots délivrés (Traçabilité Lot/FEFO)
        Schema::create('lignes_dispensation', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('dispensation_id')->index();
            $table->uuid('produit_id')->index();
            $table->uuid('stock_lot_id')->index();
            $table->integer('quantite');
            $table->decimal('prix_unitaire', 12, 2);
            $table->decimal('montant_ligne', 12, 2);
            $table->string('posologie', 255)->nullable();
            $table->string('duree_traitement', 100)->nullable();
            $table->timestamps();

            $table->foreign('dispensation_id')->references('id')->on('dispensations')->cascadeOnDelete();
            $table->foreign('produit_id')->references('id')->on('produits');
            $table->foreign('stock_lot_id')->references('id')->on('stocks_lots');
        });

        // 5. Registre officiel des Stupéfiants & Substances Vénéneuses (BPD-3 & Art 7.15 à 7.20)
        // Registre à balance permanente inaltérable
        Schema::create('registre_stupefiants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->integer('numero_ordre'); // Numéro d'ordre chronologique inaltérable
            $table->dateTime('date_mouvement');
            $table->enum('type_mouvement', ['entree_livraison', 'sortie_dispensation', 'destruction_perime', 'ajustement_inventaire']);
            $table->uuid('produit_id')->index();
            $table->uuid('stock_lot_id')->nullable()->index();
            $table->integer('quantite');
            $table->integer('stock_precedent');
            $table->integer('stock_nouveau');
            $table->string('reference_piece', 100); // N° BL ou N° Dispensation ordonnance
            $table->string('tiers_nom', 150)->nullable(); // Nom Grossiste ou Nom Patient
            $table->string('prescripteur_nom', 150)->nullable();
            $table->uuid('operateur_id')->index();
            $table->uuid('pharmacien_visa_id')->nullable()->index(); // Visa obligatoire du pharmacien titulaire
            $table->dateTime('date_visa')->nullable();
            $table->text('observations')->nullable();
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('produit_id')->references('id')->on('produits');
            $table->foreign('stock_lot_id')->references('id')->on('stocks_lots');
            $table->foreign('operateur_id')->references('id')->on('users');
            $table->foreign('pharmacien_visa_id')->references('id')->on('users');
            $table->index(['officine_id', 'produit_id', 'numero_ordre']);
        });

        // 6. Registre officiel des Préparations magistrales et officinales (BPD Chapitre 6 & POI-03)
        Schema::create('registre_preparations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->string('numero_preparation', 50)->unique(); // Ex: PREP-2026-001
            $table->string('nom_preparation', 200);
            $table->enum('type_preparation', ['magistrale', 'officinale'])->default('magistrale');
            $table->text('formule_detaillee'); // Ingrédients, quantités exactes
            $table->json('matieres_premieres_lots')->nullable(); // JSON des lots et fournisseurs MP
            $table->string('quantite_produite', 100); // Ex: 500 ml, 100 gélules
            $table->string('conditionnement', 100); // Flacon teinté, Pot hermétique
            $table->date('date_fabrication');
            $table->date('date_limite_utilisation'); // DLU calculée
            $table->string('patient_nom', 150)->nullable();
            $table->string('prescripteur_nom', 150)->nullable();
            $table->uuid('executant_id')->index(); // Préparateur ou pharmacien
            $table->uuid('pharmacien_visa_id')->nullable()->index(); // Contrôle & Visa libération du pharmacien
            $table->dateTime('date_visa')->nullable();
            $table->boolean('conforme')->default(true);
            $table->text('controles_effectues')->nullable(); // Aspect, pH, masse unitaire, etc.
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('executant_id')->references('id')->on('users');
            $table->foreign('pharmacien_visa_id')->references('id')->on('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('registre_preparations');
        Schema::dropIfExists('registre_stupefiants');
        Schema::dropIfExists('lignes_dispensation');
        Schema::dropIfExists('dispensations');
        Schema::dropIfExists('stocks_lots');
        Schema::dropIfExists('produits');
    }
};

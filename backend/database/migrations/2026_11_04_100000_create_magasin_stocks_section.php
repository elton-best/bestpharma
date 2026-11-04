<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * BEGPHARMA — Magasin & Stocks (Cahier des charges v1.0 · 4 nov 2026)
     * Couvre : STO-02 à STO-21, STU-01 à STU-15, PRE
     * Convention : STO = stock, STU = stupéfiants, PRE = préparations
     */
    public function up(): void
    {
        // ------------------------------------------------------------
        // 0. EMPLACEMENTS — Plan des zones (STO-04)
        // Comptoir, Réserve, Frigo 2-8°C, Armoire sécurisée, Attente contrôle, Retours, Déchets
        // ------------------------------------------------------------
        Schema::create('emplacements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->string('code', 30); // ex: COMPTOIR, RESERVE, FRIGO, ARMOIRE, ATTENTE, RETOURS, DECHETS
            $table->string('libelle', 100);
            $table->enum('type_zone', ['comptoir', 'reserve', 'frigo', 'armoire_securisee', 'attente_controle', 'retours', 'dechets'])->default('reserve');
            $table->boolean('accepte_thermolabile')->default(true);
            $table->boolean('accepte_stupefiant')->default(false);
            $table->boolean('accepte_liste')->default(false);
            $table->integer('capacite')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->unique(['officine_id', 'code']);
        });

        // ------------------------------------------------------------
        // 1. EXTENSION PRODUITS — Fiche produit complète (STO-02)
        // ------------------------------------------------------------
        Schema::table('produits', function (Blueprint $table) {
            $table->string('code_interne', 50)->nullable()->after('code_cip');
            $table->json('codes_barres')->nullable()->after('code_interne'); // plusieurs EAN/DataMatrix
            $table->string('laboratoire', 150)->nullable()->after('classe_therapeutique');
            $table->string('groupe_taxation', 20)->default('A_EXONERE')->after('tableau_substance'); // A_EXONERE, B_TAXABLE
            $table->integer('stock_max')->nullable()->after('seuil_stock_min');
            $table->integer('stock_urgence')->nullable()->after('stock_max');
            $table->string('photo_url', 500)->nullable()->after('seuil_stock_securite');
            $table->enum('classe_produit', ['libre', 'liste_1', 'liste_2', 'stupefiant', 'psychotrope', 'derive_sang', 'thermolabile', 'medication_officinale', 'standard'])->default('standard')->after('tableau_substance');
            $table->decimal('prix_achat_moyen', 12, 2)->default(0)->after('prix_achat_ht'); // CMP pour STO-18
            $table->boolean('est_dormant')->default(false);
            $table->timestamps(); // déjà existant mais safe
        });

        // ------------------------------------------------------------
        // 2. EXTENSION STOCKS_LOTS — Statuts complets §0.2 (STO-03, STO-10)
        // Statuts : commercialisable, en_attente_controle, a_evaluer, quarantaine,
        //           attente_retour_fournisseur, rejete, dechet_a_detruire, epuise
        // Vendable = uniquement commercialisable (RG-D02)
        // ------------------------------------------------------------
        // Ajout colonnes sans drop enum existant (compat ascendante)
        Schema::table('stocks_lots', function (Blueprint $table) {
            $table->uuid('emplacement_id')->nullable()->after('emplacement');
            $table->decimal('cout_achat_total', 12, 2)->default(0)->after('prix_achat_unitaire');
            $table->string('fournisseur_agrement', 100)->nullable()->after('fournisseur_nom');
            $table->date('date_reception')->nullable()->after('date_fabrication');
            $table->string('statut_detail', 50)->nullable()->after('statut'); // nouveau statut étendu
            $table->text('motif_statut')->nullable()->after('motif_quarantaine');
            $table->uuid('dernier_modificateur_id')->nullable()->after('motif_quarantaine');
            $table->timestamp('date_changement_statut')->nullable();
            $table->json('pieces_jointes')->nullable(); // BL, certificat, photos
            $table->json('controles_reception')->nullable(); // checklist STO-05

            $table->foreign('emplacement_id')->references('id')->on('emplacements')->nullOnDelete();
            $table->foreign('dernier_modificateur_id')->references('id')->on('users')->nullOnDelete();
        });

        // Migration des anciens statuts vers nouveau système (en_stock -> commercialisable)
        DB::statement("UPDATE stocks_lots SET statut_detail = CASE
            WHEN statut = 'en_stock' THEN 'commercialisable'
            WHEN statut = 'quarantaine' THEN 'quarantaine'
            WHEN statut = 'retire' THEN 'rejete'
            WHEN statut = 'epuise' THEN 'epuise'
            ELSE 'commercialisable' END
            WHERE statut_detail IS NULL");

        // ------------------------------------------------------------
        // 3. MOUVEMENTS DE STOCK — Journal inaltérable (STO-09, INT-01)
        // Entrée, Vente, Retour client, Retour fournisseur, Transfert, Casse, Démarque, Destruction, Ajustement
        // ------------------------------------------------------------
        Schema::create('mouvements_stock', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->uuid('stock_lot_id')->nullable()->index();
            $table->uuid('produit_id')->index();
            $table->enum('type_mouvement', [
                'entree_reception',
                'vente',
                'retour_client',
                'retour_fournisseur',
                'transfert_emplacement',
                'casse',
                'demarque',
                'destruction',
                'ajustement_inventaire',
                'changement_statut',
                'contre_passation'
            ]);
            $table->integer('quantite'); // positif = entrée, négatif = sortie
            $table->integer('stock_avant');
            $table->integer('stock_apres');
            $table->string('emplacement_source', 100)->nullable();
            $table->string('emplacement_cible', 100)->nullable();
            $table->string('reference_piece', 100)->nullable(); // BL, ticket, PV
            $table->uuid('auteur_id')->index();
            $table->uuid('validateur_id')->nullable()->index(); // pharmacien pour ajustements
            $table->text('motif')->nullable();
            $table->json('metadonnees')->nullable(); // justification FEFO, lot non-FEFO, etc.
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('stock_lot_id')->references('id')->on('stocks_lots')->nullOnDelete();
            $table->foreign('produit_id')->references('id')->on('produits')->cascadeOnDelete();
            $table->foreign('auteur_id')->references('id')->on('users');
            $table->foreign('validateur_id')->references('id')->on('users');
            $table->index(['officine_id', 'produit_id', 'created_at']);
        });

        // ------------------------------------------------------------
        // 4. INVENTAIRES — Tournant & général (STO-12)
        // ------------------------------------------------------------
        Schema::create('inventaires', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->string('reference', 50)->unique(); // INV-2026-001
            $table->enum('type', ['tournant', 'general_annuel'])->default('tournant');
            $table->string('zone', 100)->nullable(); // emplacement ciblé ou null = tous
            $table->enum('statut', ['brouillon', 'en_cours', 'en_attente_validation', 'valide', 'annule'])->default('brouillon');
            $table->date('date_inventaire');
            $table->uuid('initiateur_id')->index();
            $table->uuid('validateur_id')->nullable()->index();
            $table->timestamp('date_validation')->nullable();
            $table->json('Parametres')->nullable(); // aveugle, double comptage
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('initiateur_id')->references('id')->on('users');
            $table->foreign('validateur_id')->references('id')->on('users');
        });

        Schema::create('lignes_inventaire', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('inventaire_id')->index();
            $table->uuid('produit_id')->index();
            $table->uuid('stock_lot_id')->nullable()->index();
            $table->integer('quantite_theorique');
            $table->integer('quantite_comptee')->nullable();
            $table->integer('ecart')->nullable(); // calculé
            $table->decimal('valorisation_ecart', 12, 2)->nullable();
            $table->text('commentaire')->nullable();
            $table->uuid('compteur_id')->nullable()->index();
            $table->timestamps();

            $table->foreign('inventaire_id')->references('id')->on('inventaires')->cascadeOnDelete();
            $table->foreign('produit_id')->references('id')->on('produits');
            $table->foreign('stock_lot_id')->references('id')->on('stocks_lots')->nullOnDelete();
            $table->foreign('compteur_id')->references('id')->on('users');
        });

        // ------------------------------------------------------------
        // 5. AVIS DE RAPPEL DE LOTS (STO-14)
        // ------------------------------------------------------------
        Schema::create('avis_rappels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->string('reference', 50)->unique(); // RAPPEL-2026-001
            $table->string('source', 150); // ABMed, fabricant, grossiste
            $table->text('produits_concernes'); // libellé
            $table->json('lots_concernes')->nullable(); // [{produit_id, numero_lot}]
            $table->date('date_avis');
            $table->text('action_requise');
            $table->enum('statut', ['actif', 'en_traitement', 'cloture'])->default('actif');
            $table->json('pieces_jointes')->nullable();
            $table->uuid('auteur_id')->index();
            $table->uuid('cloture_par_id')->nullable()->index();
            $table->timestamp('date_cloture')->nullable();
            $table->text('preuve_cloture')->nullable();
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('auteur_id')->references('id')->on('users');
            $table->foreign('cloture_par_id')->references('id')->on('users');
        });

        // ------------------------------------------------------------
        // 6. RETOURS FOURNISSEUR (STO-16)
        // ------------------------------------------------------------
        Schema::create('retours_fournisseur', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->string('reference', 50)->unique(); // RET-2026-001
            $table->string('fournisseur_nom', 200);
            $table->enum('motif', ['perime', 'avarie', 'non_conforme', 'rappele', 'erreur_livraison', 'autre'])->default('perime');
            $table->json('lots')->nullable(); // détail des lots retournés
            $table->decimal('montant_attendu', 12, 2)->default(0);
            $table->enum('statut', ['en_attente', 'expedie', 'avoir_recu', 'annule'])->default('en_attente');
            $table->string('bon_retour_ref', 100)->nullable();
            $table->string('avoir_ref', 100)->nullable();
            $table->uuid('auteur_id')->index();
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('auteur_id')->references('id')->on('users');
        });

        // ------------------------------------------------------------
        // 7. DECHETS & DESTRUCTION — Circuit BPD9 (STO-17)
        // ------------------------------------------------------------
        Schema::create('lots_dechets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->string('reference', 50)->unique(); // DECHET-2026-001
            $table->enum('motif', ['perime', 'avarie', 'non_conforme', 'rappele', 'retour_client', 'autre'])->default('perime');
            $table->json('lots_originels')->nullable(); // snapshot des lots sources
            $table->integer('quantite_totale')->default(0);
            $table->decimal('valeur_perte', 12, 2)->default(0); // STO-18
            $table->string('zone_stockage', 100)->default('Aire des déchets sécurisée');
            $table->enum('statut', ['constitue', 'en_attente_prestataire', 'detruit', 'annule'])->default('constitue');
            $table->string('prestataire_nom', 200)->nullable();
            $table->date('date_destruction_prevue')->nullable();
            $table->date('date_destruction_reelle')->nullable();
            $table->text('pv_url')->nullable();
            $table->text('certificat_url')->nullable();
            $table->uuid('constitue_par_id')->index();
            $table->uuid('detruit_par_id')->nullable()->index();
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('constitue_par_id')->references('id')->on('users');
            $table->foreign('detruit_par_id')->references('id')->on('users');
        });

        // ------------------------------------------------------------
        // 8. FICHIERS / PIECES JOINTES — Gestion unifiée (0.4)
        // Chiffrage, SHA-256, versionning
        // ------------------------------------------------------------
        Schema::create('fichiers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->string('objet_type', 100)->index(); // StockLot, Inventaire, AvisRappel, Dechet, Preparation
            $table->uuid('objet_id')->index();
            $table->string('nom_original', 255);
            $table->string('nom_stocke', 255);
            $table->string('mime_type', 100);
            $table->bigInteger('taille_octets');
            $table->string('sha256', 64);
            $table->string('chemin', 500);
            $table->boolean('chiffre')->default(true);
            $table->integer('version')->default(1);
            $table->uuid('auteur_id')->index();
            $table->timestamp('date_conservation_jusqua')->nullable();
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('auteur_id')->references('id')->on('users');
        });

        // ------------------------------------------------------------
        // 9. EXTENSION REGISTRE STUPEFIANTS — Vol/Perte/Destruction (STU-10/11)
        // ------------------------------------------------------------
        Schema::table('registre_stupefiants', function (Blueprint $table) {
            $table->uuid('ordonnance_id')->nullable()->after('prescripteur_nom');
            $table->string('patient_nom', 150)->nullable()->after('tiers_nom');
            $table->string('patient_telephone', 50)->nullable()->after('patient_nom');
            $table->enum('categorie', ['stupefiant', 'psychotrope', 'liste_1', 'liste_2', 'derive_sang'])->default('stupefiant')->after('type_mouvement');
            $table->string('declaration_vol_ref', 100)->nullable()->after('observations');
            $table->string('autorisation_destruction_ref', 100)->nullable()->after('declaration_vol_ref');
            $table->json('pieces_jointes')->nullable()->after('observations');
            $table->boolean('est_ordonnancier')->default(false)->after('observations');
            $table->timestamp('date_ecart_detecte')->nullable()->after('observations');
        });

        // ------------------------------------------------------------
        // 10. TABLE ARMOIRE SECURISEE — Contenu temps réel (STU-09)
        // ------------------------------------------------------------
        Schema::create('armoire_contenu', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->uuid('produit_id')->index();
            $table->uuid('stock_lot_id')->index();
            $table->integer('quantite');
            $table->string('emplacement_code', 30)->default('ARMOIRE');
            $table->timestamp('derniere_verif')->nullable();
            $table->uuid('verifie_par_id')->nullable()->index();
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('produit_id')->references('id')->on('produits')->cascadeOnDelete();
            $table->foreign('stock_lot_id')->references('id')->on('stocks_lots')->cascadeOnDelete();
            $table->foreign('verifie_par_id')->references('id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('armoire_contenu');
        Schema::table('registre_stupefiants', function (Blueprint $table) {
            $table->dropColumn(['ordonnance_id', 'patient_nom', 'patient_telephone', 'categorie', 'declaration_vol_ref', 'autorisation_destruction_ref', 'pieces_jointes', 'est_ordonnancier', 'date_ecart_detecte']);
        });
        Schema::dropIfExists('fichiers');
        Schema::dropIfExists('lots_dechets');
        Schema::dropIfExists('retours_fournisseur');
        Schema::dropIfExists('avis_rappels');
        Schema::dropIfExists('lignes_inventaire');
        Schema::dropIfExists('inventaires');
        Schema::dropIfExists('mouvements_stock');
        Schema::table('stocks_lots', function (Blueprint $table) {
            try { $table->dropForeign(['emplacement_id']); } catch (\Throwable $e) {}
            try { $table->dropForeign(['dernier_modificateur_id']); } catch (\Throwable $e) {}
            $table->dropColumn(['emplacement_id', 'cout_achat_total', 'fournisseur_agrement', 'date_reception', 'statut_detail', 'motif_statut', 'dernier_modificateur_id', 'date_changement_statut', 'pieces_jointes', 'controles_reception']);
        });
        Schema::table('produits', function (Blueprint $table) {
            $table->dropColumn(['code_interne', 'codes_barres', 'laboratoire', 'groupe_taxation', 'stock_max', 'stock_urgence', 'photo_url', 'classe_produit', 'prix_achat_moyen', 'est_dormant']);
        });
        Schema::dropIfExists('emplacements');
    }
};

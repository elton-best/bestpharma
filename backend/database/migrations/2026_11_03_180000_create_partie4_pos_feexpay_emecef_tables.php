<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Partie 4 :
     * - Sessions de caisse (ouverture, fond de caisse, clôture X/Z, écarts)
     * - Ventes de caisse POS & Lignes de vente avec ventilation TVA béninoise
     * - Paiements électroniques FeexPay (MTN MoMo, Moov Money, Celtiis Cash)
     * - Facturation normalisée DGI e-MECeF (NIM, compteur, code MECeF, signature, QR code fiscal)
     * - Écritures comptables automatiques SYSCOHADA (Plan comptable OHADA)
     */
    public function up(): void
    {
        // 1. Sessions de caisse
        Schema::create('sessions_caisse', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->uuid('caissier_id')->index();
            $table->string('numero_session', 50)->unique(); // Ex: CAISSE-2026-0001
            $table->decimal('fond_caisse_ouverture', 12, 2)->default(0);
            $table->decimal('total_encaisse_especes', 12, 2)->default(0);
            $table->decimal('total_encaisse_mobile_money', 12, 2)->default(0);
            $table->decimal('total_encaisse_carte', 12, 2)->default(0);
            $table->decimal('fond_caisse_fermeture_theorique', 12, 2)->default(0);
            $table->decimal('fond_caisse_fermeture_reel', 12, 2)->nullable();
            $table->decimal('ecart_caisse', 12, 2)->default(0);
            $table->enum('statut', ['ouverte', 'fermee'])->default('ouverte');
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->text('notes_cloture')->nullable();
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('caissier_id')->references('id')->on('users');
        });

        // 2. Ventes de caisse POS
        Schema::create('ventes_caisse', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->uuid('session_caisse_id')->index();
            $table->uuid('caissier_id')->index();
            $table->uuid('dispensation_id')->nullable()->index(); // Lié si vente sur ordonnance
            $table->string('numero_ticket', 50)->unique(); // Ex: TCK-2026-00001
            $table->string('client_nom', 150)->default('Client Comptoir');
            $table->string('client_ifu', 30)->nullable(); // IFU client pour déductibilité TVA
            $table->decimal('montant_brut_ht', 12, 2)->default(0);
            $table->decimal('montant_remise', 12, 2)->default(0);
            $table->decimal('montant_tva', 12, 2)->default(0);
            $table->decimal('montant_net_ttc', 12, 2)->default(0);
            $table->decimal('montant_recu', 12, 2)->default(0);
            $table->decimal('monnaie_rendue', 12, 2)->default(0);
            $table->enum('mode_reglement', ['especes', 'mobile_money', 'carte', 'mixte'])->default('especes');
            $table->enum('statut', ['payee', 'annulee'])->default('payee');
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('session_caisse_id')->references('id')->on('sessions_caisse')->cascadeOnDelete();
            $table->foreign('caissier_id')->references('id')->on('users');
            $table->foreign('dispensation_id')->references('id')->on('dispensations')->nullOnDelete();
        });

        // 3. Lignes d'articles vendus avec ventilation TVA béninoise
        Schema::create('lignes_vente', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('vente_id')->index();
            $table->uuid('produit_id')->index();
            $table->uuid('stock_lot_id')->nullable()->index();
            $table->integer('quantite');
            $table->decimal('prix_unitaire_ttc', 12, 2);
            $table->decimal('taux_tva', 5, 2)->default(0); // 0% pour médicaments essentiels, 18% pour parapharmacie
            $table->enum('groupe_taxation', ['A_EXONERE', 'B_TAXABLE'])->default('A_EXONERE');
            $table->decimal('total_ligne', 12, 2);
            $table->timestamps();

            $table->foreign('vente_id')->references('id')->on('ventes_caisse')->cascadeOnDelete();
            $table->foreign('produit_id')->references('id')->on('produits');
            $table->foreign('stock_lot_id')->references('id')->on('stocks_lots')->nullOnDelete();
        });

        // 4. Transactions Paiements Électroniques FeexPay (Bénin)
        Schema::create('paiements_feexpay', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->uuid('vente_id')->index();
            $table->string('reference_feexpay', 100)->unique();
            $table->enum('operateur', ['mtn', 'moov', 'celtiis']);
            $table->string('telephone_payeur', 30);
            $table->decimal('montant', 12, 2);
            $table->enum('statut', ['pending', 'successful', 'failed'])->default('pending');
            $table->string('transaction_id_operateur', 100)->nullable();
            $table->json('payload_reponse')->nullable();
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('vente_id')->references('id')->on('ventes_caisse')->cascadeOnDelete();
        });

        // 5. Factures Normalisées DGI e-MECeF (Bénin)
        Schema::create('factures_emecef', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->uuid('vente_id')->unique();
            $table->string('numero_facture_dgi', 100)->unique(); // Ex: 1000000000000-2026-FV-00001
            $table->string('ifu_officine', 50); // Ex: 0202611223344
            $table->string('nim_machine', 50); // Numéro d'Identification de la Machine (ex: MC00001234)
            $table->string('type_facture', 10)->default('FV'); // FV = Facture de Vente, EV = Facture d'Avoir
            $table->integer('compteur_type'); // Compteur séquentiel FV
            $table->integer('compteur_total'); // Compteur global e-MECeF
            $table->string('code_mecef', 100); // Code de sécurité e-MECeF unique
            $table->text('signature_dgi'); // Signature cryptographique DGI
            $table->text('qr_code_data'); // Chaîne officielle encodée pour le QR Code DGI
            $table->enum('statut', ['certifiee', 'echec'])->default('certifiee');
            $table->timestamp('date_certification');
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('vente_id')->references('id')->on('ventes_caisse')->cascadeOnDelete();
        });

        // 6. Écritures Comptables SYSCOHADA (Plan comptable OHADA)
        Schema::create('ecritures_syscohada', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('officine_id')->index();
            $table->uuid('vente_id')->nullable()->index();
            $table->date('date_piece');
            $table->string('numero_piece', 50);
            $table->string('numero_compte', 20); // 7011, 5311, 5121, 4431...
            $table->string('libelle_compte', 150);
            $table->string('libelle_ecriture', 255);
            $table->decimal('debit', 12, 2)->default(0);
            $table->decimal('credit', 12, 2)->default(0);
            $table->string('journal_code', 10)->default('VT'); // VT = Ventes, CA = Caisse, BQ = Banque
            $table->timestamps();

            $table->foreign('officine_id')->references('id')->on('officines')->cascadeOnDelete();
            $table->foreign('vente_id')->references('id')->on('ventes_caisse')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ecritures_syscohada');
        Schema::dropIfExists('factures_emecef');
        Schema::dropIfExists('paiements_feexpay');
        Schema::dropIfExists('lignes_vente');
        Schema::dropIfExists('ventes_caisse');
        Schema::dropIfExists('sessions_caisse');
    }
};

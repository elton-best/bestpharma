<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Table des gardes d'officines
        Schema::create('officines_gardes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->nullable()->constrained('officines')->nullOnDelete();
            $table->string('nom_officine');
            $table->string('commune'); // Cotonou, Porto-Novo, etc.
            $table->string('zone_quartier');
            $table->string('telephone');
            $table->dateTime('date_debut');
            $table->dateTime('date_fin');
            $table->boolean('est_garde_active')->default(true);
            $table->text('commentaires')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['commune', 'date_debut', 'date_fin']);
        });

        // 2. Table des transferts inter-officines
        Schema::create('transferts_inter_officines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('numero_transfert')->unique();
            $table->foreignUuid('officine_source_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignUuid('officine_destinataire_id')->constrained('officines')->cascadeOnDelete();
            $table->string('statut')->default('brouillon'); // brouillon, valide, expedie, receptionne, annule
            $table->string('motif')->nullable();
            $table->foreignUuid('demandeur_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('valide_par_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('expedie_a')->nullable();
            $table->dateTime('receptionne_a')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['officine_source_id', 'officine_destinataire_id', 'statut']);
        });

        // 3. Lignes de transferts inter-officines
        Schema::create('lignes_transferts_inter_officines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('transfert_id')->constrained('transferts_inter_officines')->cascadeOnDelete();
            $table->foreignUuid('produit_id')->constrained('produits')->cascadeOnDelete();
            $table->foreignUuid('stock_lot_source_id')->nullable()->constrained('stocks_lots')->nullOnDelete();
            $table->string('numero_lot');
            $table->date('date_peremption');
            $table->integer('quantite');
            $table->decimal('prix_unitaire_achat', 12, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lignes_transferts_inter_officines');
        Schema::dropIfExists('transferts_inter_officines');
        Schema::dropIfExists('officines_gardes');
    }
};

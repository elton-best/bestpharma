<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('echeances', function (Blueprint $table) {
            $table->string('responsable')->nullable()->after('titre');
            $table->string('priorite', 30)->default('important')->after('categorie'); // critique, important, information
            $table->string('periodicite', 30)->default('annuelle')->after('date_echeance'); // unique, mensuelle, trimestrielle, semestrielle, annuelle
            $table->boolean('reglementaire')->default(true)->after('periodicite');
            $table->date('date_realisation')->nullable()->after('fait');
            $table->string('preuve_titre')->nullable()->after('date_realisation');
            $table->string('justificatif_url')->nullable()->after('preuve_titre');
            $table->text('notes')->nullable()->after('justificatif_url');
        });
    }

    public function down(): void
    {
        Schema::table('echeances', function (Blueprint $table) {
            $table->dropColumn([
                'responsable',
                'priorite',
                'periodicite',
                'reglementaire',
                'date_realisation',
                'preuve_titre',
                'justificatif_url',
                'notes',
            ]);
        });
    }
};

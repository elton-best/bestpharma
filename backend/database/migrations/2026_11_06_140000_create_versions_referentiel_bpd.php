<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('versions_referentiel_bpd', function (Blueprint $table) {
            // Identité du contenu importé, distincte de l'empreinte du PDF.
            $table->string('id', 64)->primary();
            $table->string('source_sha256', 64);
            $table->string('decision');
            $table->unsignedInteger('total_articles');
            $table->string('statut')->default('a_relire');
            $table->jsonb('contenu');
            $table->timestampTz('created_at')->useCurrent();
        });
        Schema::table('campagnes_auto_evaluation', function (Blueprint $table) {
            // NULL = ancien référentiel. Aucun rapprochement automatique par numéro.
            $table->string('referentiel_version_id', 64)->nullable();
            $table->foreign('referentiel_version_id')->references('id')->on('versions_referentiel_bpd')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('campagnes_auto_evaluation', function (Blueprint $table) {
            $table->dropForeign(['referentiel_version_id']);
            $table->dropColumn('referentiel_version_id');
        });
        Schema::dropIfExists('versions_referentiel_bpd');
    }
};

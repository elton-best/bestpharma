<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compta_exercices', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('officine_id')->index();
            $table->string('code', 20);
            $table->string('label', 120);
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status', 20)->default('ouvert'); // ouvert, cloture
            $table->timestamp('closed_at')->nullable();
            $table->unsignedBigInteger('closed_by_user_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'code']);
        });

        Schema::create('compta_comptes', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('officine_id')->index();
            $table->string('code', 20);
            $table->string('label', 180);
            $table->unsignedTinyInteger('classe'); // 1..8 SYSCOHADA
            $table->string('nature', 20); // actif, passif, charge, produit
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['officine_id', 'code']);
        });

        Schema::create('compta_journaux', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('officine_id')->index();
            $table->string('code', 15);
            $table->string('name', 120);
            $table->string('journal_type', 30); // ventes, achats, caisse, banque, operations_diverses
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['officine_id', 'code']);
        });

        Schema::create('compta_ecritures', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('officine_id')->index();
            $table->foreignId('exercice_id')->constrained('compta_exercices')->cascadeOnDelete();
            $table->foreignId('journal_id')->constrained('compta_journaux')->restrictOnDelete();
            $table->string('reference', 60);
            $table->date('entry_date');
            $table->string('label', 255);
            $table->string('source_type', 40)->default('manual'); // manual, sale, expense_request, receipt
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('idempotency_key', 120)->nullable();
            $table->string('status', 20)->default('brouillon'); // brouillon, validee
            $table->decimal('total_debit', 14, 2)->default(0);
            $table->decimal('total_credit', 14, 2)->default(0);
            $table->unsignedBigInteger('created_by_user_id')->nullable();
            $table->unsignedBigInteger('validated_by_user_id')->nullable();
            $table->timestamp('validated_at')->nullable();
            $table->string('entry_hash', 64)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'source_type', 'source_id']);
            $table->index(['officine_id', 'idempotency_key']);
        });

        Schema::create('compta_ecriture_lignes', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('officine_id')->index();
            $table->foreignId('ecriture_id')->constrained('compta_ecritures')->cascadeOnDelete();
            $table->foreignId('compte_id')->constrained('compta_comptes')->restrictOnDelete();
            $table->unsignedInteger('line_order')->default(1);
            $table->string('label', 255);
            $table->decimal('debit', 14, 2)->default(0);
            $table->decimal('credit', 14, 2)->default(0);
            $table->string('third_party_ref', 80)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compta_ecriture_lignes');
        Schema::dropIfExists('compta_ecritures');
        Schema::dropIfExists('compta_journaux');
        Schema::dropIfExists('compta_comptes');
        Schema::dropIfExists('compta_exercices');
    }
};

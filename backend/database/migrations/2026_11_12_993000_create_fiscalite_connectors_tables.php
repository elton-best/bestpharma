<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fiscal_invoices', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('officine_id')->index();
            $table->unsignedBigInteger('sale_id')->nullable()->index();
            $table->string('reference', 60);
            $table->string('invoice_type', 10)->default('FV'); // FV (Vente), FA (Avoir)
            $table->string('customer_ifu', 20)->nullable();
            $table->string('customer_name', 150)->default('Client Comptoir');
            $table->decimal('total_ht', 14, 2)->default(0);
            $table->decimal('total_tva', 14, 2)->default(0);
            $table->decimal('total_ttc', 14, 2)->default(0);
            $table->string('status', 20)->default('brouillon'); // brouillon, certifiee, erreur
            $table->string('mecef_uid', 120)->nullable();
            $table->string('mecef_code', 120)->nullable();
            $table->text('mecef_qr_data')->nullable();
            $table->string('mecef_counters', 120)->nullable();
            $table->timestamp('certified_at')->nullable();
            $table->string('idempotency_key', 120)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'idempotency_key']);
        });

        Schema::create('feexpay_intents', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('officine_id')->index();
            $table->unsignedBigInteger('sale_id')->nullable()->index();
            $table->string('reference', 60);
            $table->decimal('amount', 12, 2);
            $table->string('currency', 10)->default('XOF');
            $table->string('network', 20)->default('MTN'); // MTN, MOOV, CELTIIS, CARTE
            $table->string('phone_number', 30)->nullable();
            $table->string('status', 20)->default('initie'); // initie, en_attente, confirme, echoue
            $table->string('provider_reference', 120)->nullable();
            $table->json('callback_payload')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->string('idempotency_key', 120)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'provider_reference']);
            $table->index(['officine_id', 'idempotency_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feexpay_intents');
        Schema::dropIfExists('fiscal_invoices');
    }
};

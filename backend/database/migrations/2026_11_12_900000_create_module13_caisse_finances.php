<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $officineIds = DB::table('officines')->pluck('id');
        foreach ($officineIds as $id) {
            foreach (['tresorerie', 'comptabilite'] as $mod) {
                DB::table('officine_modules')->updateOrInsert(
                    ['officine_id' => $id, 'module' => $mod],
                    ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]
                );
            }
        }

        // 1. Caisses physiques / Postes (CDC 3.1)
        Schema::create('cash_registers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('code');
            $table->string('name');
            $table->string('location_label')->nullable();
            $table->decimal('discrepancy_alert_threshold', 12, 2)->default(1000.00); // CDC 5 : configurable (défaut 1000 FCFA)
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'code']);
        });

        // 2. Sessions de caisse (CDC 3.1)
        Schema::create('cash_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('cash_register_id')->constrained('cash_registers')->restrictOnDelete();
            $table->string('session_ref');
            $table->foreignId('cashier_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->decimal('opening_float', 12, 2)->default(0.00);
            $table->decimal('expected_closing_balance', 12, 2)->default(0.00);
            $table->decimal('actual_closing_balance', 12, 2)->nullable();
            $table->decimal('discrepancy_amount', 12, 2)->default(0.00);
            $table->text('discrepancy_justification')->nullable();
            $table->string('status')->default('ouverte'); // ouverte, passation_en_cours, cloturee
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'session_ref']);
            $table->index(['officine_id', 'status']);
        });

        // 3. Transactions de paiement idempotentes (CDC 3.2, 3.6 & 7)
        Schema::create('payment_transactions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('cash_session_id')->constrained('cash_sessions')->restrictOnDelete();
            $table->foreignId('sale_id')->nullable()->constrained('sales')->nullOnDelete();
            $table->string('transaction_ref');
            $table->string('idempotency_key')->nullable(); // CDC 7 : double-clic traité 1 seule fois
            $table->string('transaction_type'); // encaissement, remboursement, contrepassation
            $table->string('payment_method'); // especes, mobile_money, carte, credit
            $table->string('external_provider_ref')->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('status')->default('confirme'); // en_attente, confirme, annule, contrepasse
            $table->unsignedBigInteger('original_transaction_id')->nullable();
            $table->text('reversal_reason')->nullable();
            $table->foreignId('recorded_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('occurred_at');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'transaction_ref']);
            $table->unique(['officine_id', 'idempotency_key']);
            $table->index(['officine_id', 'cash_session_id']);
        });

        // 4. Mouvements de caisse manuels (CDC 3.3 & 3.6)
        Schema::create('cash_movements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('cash_session_id')->constrained('cash_sessions')->restrictOnDelete();
            $table->string('direction'); // entree, sortie
            $table->string('category'); // fond_caisse, depense, versement_banque, remboursement, correction, autre
            $table->decimal('amount', 12, 2);
            $table->text('reason');
            $table->string('status')->default('valide'); // valide, contrepasse
            $table->unsignedBigInteger('reversal_of_id')->nullable();
            $table->foreignId('recorded_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['officine_id', 'cash_session_id']);
        });

        // 5. Passations conjointes de caisse (CDC 3.4 & 7)
        Schema::create('handovers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('cash_session_id')->constrained('cash_sessions')->restrictOnDelete();
            $table->foreignId('outgoing_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('incoming_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('theoretical_cash', 12, 2);
            $table->decimal('counted_cash', 12, 2);
            $table->decimal('variance_amount', 12, 2); // counted - theoretical (conservé!)
            $table->json('tickets_summary')->nullable();
            $table->text('anomalies_notes')->nullable();
            $table->timestamp('outgoing_signed_at');
            $table->timestamp('incoming_signed_at')->nullable();
            $table->string('status')->default('en_attente_entrant'); // en_attente_entrant, signee, ecart_signale
            $table->unsignedBigInteger('created_action_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'cash_session_id']);
        });

        // 6. Comptages / Billetage (CDC 3.4)
        Schema::create('cash_counts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('cash_session_id')->constrained('cash_sessions')->restrictOnDelete();
            $table->foreignId('handover_id')->nullable()->constrained('handovers')->nullOnDelete();
            $table->string('count_type'); // ouverture, passation, cloture, controle_inopine
            $table->json('denominations');
            $table->decimal('total_counted', 12, 2);
            $table->foreignId('counted_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('counted_at');
            $table->timestamps();

            $table->index(['officine_id', 'cash_session_id']);
        });

        // 7. Demandes de dépenses & approbation (CDC 3.3 & 5)
        Schema::create('expense_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('cash_session_id')->nullable()->constrained('cash_sessions')->nullOnDelete();
            $table->string('reference');
            $table->string('category'); // fournitures, transport, entretien, urgence_bpd, autre
            $table->decimal('amount', 12, 2);
            $table->text('reason');
            $table->string('proof_reference')->nullable();
            $table->string('status')->default('soumise'); // brouillon, soumise, approuvee, rejetee, decaissee
            $table->foreignId('requested_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('disbursed_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'status']);
        });

        // 8. Rapprochements journaliers (CDC 3.5)
        Schema::create('reconciliation_runs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('reference');
            $table->date('period_date');
            $table->decimal('total_expected', 14, 2)->default(0.00);
            $table->decimal('total_declared', 14, 2)->default(0.00);
            $table->decimal('total_variance', 14, 2)->default(0.00);
            $table->string('status')->default('ouvert'); // ouvert, ecart_a_justifier, cloture
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('closed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->unsignedBigInteger('created_action_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'period_date']);
        });

        Schema::create('reconciliation_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('reconciliation_run_id')->constrained('reconciliation_runs')->cascadeOnDelete();
            $table->string('payment_method');
            $table->decimal('expected_amount', 12, 2);
            $table->decimal('declared_amount', 12, 2);
            $table->decimal('variance_amount', 12, 2);
            $table->text('justification')->nullable();
            $table->timestamps();

            $table->index(['officine_id', 'reconciliation_run_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reconciliation_lines');
        Schema::dropIfExists('reconciliation_runs');
        Schema::dropIfExists('expense_requests');
        Schema::dropIfExists('cash_counts');
        Schema::dropIfExists('handovers');
        Schema::dropIfExists('cash_movements');
        Schema::dropIfExists('payment_transactions');
        Schema::dropIfExists('cash_sessions');
        Schema::dropIfExists('cash_registers');
    }
};

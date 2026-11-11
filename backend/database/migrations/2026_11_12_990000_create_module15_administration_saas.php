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
            DB::table('officine_modules')->updateOrInsert(
                ['officine_id' => $id, 'module' => 'platformadmin'],
                ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        // 1. Forfaits / Plans SaaS (CDC 3.1 & 5)
        Schema::create('plans', function (Blueprint $table): void {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('price_label')->nullable(); // CDC 5 : aucun prix présumé
            $table->unsignedInteger('max_users')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });

        // 2. Modules inclus par forfait (CDC 3.1)
        Schema::create('plan_features', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('plan_id')->constrained('plans')->cascadeOnDelete();
            $table->string('module_key');
            $table->string('feature_label');
            $table->boolean('is_included')->default(true);
            $table->unsignedInteger('limit_value')->nullable();
            $table->timestamps();

            $table->unique(['plan_id', 'module_key']);
        });

        // 3. Souscriptions par officine (CDC 3.2 & 3.6)
        Schema::create('subscriptions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('plans')->restrictOnDelete();
            $table->string('reference');
            $table->string('status')->default('en_attente_paiement'); // en_attente_paiement, active, suspendue, resiliee
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->text('suspension_reason')->nullable();
            $table->boolean('data_retained')->default(true); // CDC 3.6 & 7 : suspension n'efface rien
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'status']);
        });

        // 4. Droits & Quotas actifs par module (CDC 3.1 & 3.2)
        Schema::create('entitlements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained('subscriptions')->nullOnDelete();
            $table->string('module_key');
            $table->boolean('is_enabled')->default(true);
            $table->unsignedInteger('quota_limit')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'module_key']);
        });

        // 5. Événements de facturation / Webhooks idempotents (CDC 3.2 & 7)
        Schema::create('billing_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained('subscriptions')->nullOnDelete();
            $table->string('provider_name');
            $table->string('provider_event_id'); // CDC 7 : déduplication webhook rejoué
            $table->string('event_type'); // payment_confirmed, payment_failed, subscription_renewed
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('currency', 10)->default('XOF');
            $table->string('status')->default('traite'); // traite, ignore
            $table->json('payload')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->unique(['provider_name', 'provider_event_id']);
            $table->index(['officine_id', 'subscription_id']);
        });

        // 6. Tickets d'assistance (CDC 3.4)
        Schema::create('support_tickets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('reference');
            $table->string('subject');
            $table->text('description');
            $table->string('priority')->default('normale'); // basse, normale, haute, critique
            $table->string('status')->default('ouvert'); // ouvert, en_cours, resolu, cloture
            $table->foreignId('opened_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_to_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->index(['officine_id', 'status']);
        });

        // 7. Demandes d'accès temporaire support approuvées par l'officine (CDC 3.4 & 7)
        Schema::create('support_access_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('ticket_id')->nullable()->constrained('support_tickets')->nullOnDelete();
            $table->foreignId('requester_user_id')->constrained('users')->cascadeOnDelete();
            $table->text('reason');
            $table->json('requested_scope');
            $table->unsignedSmallInteger('duration_hours')->default(4);
            $table->string('status')->default('en_attente'); // en_attente, approuve, refuse, revoque, expire
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'requester_user_id', 'status']);
        });

        // 8. Paramètres plateforme & sécurité (CDC 3.5)
        Schema::create('platform_settings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->nullable()->constrained('officines')->cascadeOnDelete();
            $table->string('setting_key');
            $table->json('setting_value');
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'setting_key']);
        });

        // 9. Journal d'audit SaaS sans secrets (CDC 3.4, 3.5 & 4)
        Schema::create('audit_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->nullable()->constrained('officines')->nullOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event_type');
            $table->string('target_type')->nullable();
            $table->unsignedBigInteger('target_id')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['officine_id', 'event_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_events');
        Schema::dropIfExists('platform_settings');
        Schema::dropIfExists('support_access_requests');
        Schema::dropIfExists('support_tickets');
        Schema::dropIfExists('billing_events');
        Schema::dropIfExists('entitlements');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('plan_features');
        Schema::dropIfExists('plans');
    }
};

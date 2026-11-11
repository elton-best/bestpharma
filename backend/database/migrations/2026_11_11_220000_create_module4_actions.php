<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('action_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->restrictOnDelete();
            $table->string('reference', 40);
            $table->string('title', 180);
            $table->text('objective');
            $table->date('starts_on');
            $table->date('ends_on');
            $table->foreignId('owner_id')->constrained('users')->restrictOnDelete();
            $table->string('status', 24)->default('draft');
            $table->unsignedInteger('version')->default(1);
            $table->string('source_type', 32)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['officine_id', 'reference']);
            $table->unique(['officine_id', 'source_type', 'source_id']);
            $table->index(['officine_id', 'status', 'ends_on']);
        });

        Schema::create('action_plan_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('action_plans')->restrictOnDelete();
            $table->unsignedInteger('revision');
            $table->string('status', 24);
            $table->json('snapshot');
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('decided_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('decision', 24)->nullable();
            $table->text('decision_reason')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
            $table->unique(['plan_id', 'revision']);
        });

        Schema::create('module4_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->restrictOnDelete();
            $table->foreignId('plan_id')->nullable()->constrained('action_plans')->restrictOnDelete();
            $table->string('title', 180);
            $table->text('description');
            $table->foreignId('owner_id')->constrained('users')->restrictOnDelete();
            $table->date('due_date');
            $table->string('priority', 16)->default('normal');
            $table->json('resources')->nullable();
            $table->text('evidence_expected')->nullable();
            $table->text('effectiveness_criteria')->nullable();
            $table->string('status', 24)->default('open');
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
            $table->index(['officine_id', 'status', 'due_date']);
            $table->index(['officine_id', 'owner_id', 'status']);
        });

        Schema::create('module4_action_sources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->restrictOnDelete();
            $table->foreignId('action_id')->constrained('module4_actions')->restrictOnDelete();
            $table->string('source_type', 32);
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('label', 220);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['action_id', 'source_type', 'source_id']);
            $table->index(['officine_id', 'source_type', 'source_id']);
        });

        Schema::create('module4_action_evidence', function (Blueprint $table) {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->restrictOnDelete();
            $table->foreignId('action_id')->constrained('module4_actions')->restrictOnDelete();
            $table->foreignId('document_id')->constrained('documents')->restrictOnDelete();
            $table->unsignedInteger('document_version');
            $table->foreignId('added_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['action_id', 'document_id', 'document_version']);
        });

        Schema::create('module4_action_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->restrictOnDelete();
            $table->foreignId('action_id')->constrained('module4_actions')->restrictOnDelete();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->string('event', 32);
            $table->json('snapshot')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['officine_id', 'action_id', 'created_at']);
        });

        Schema::create('module4_effectiveness_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->restrictOnDelete();
            $table->foreignId('action_id')->constrained('module4_actions')->restrictOnDelete();
            $table->foreignId('reviewed_by')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('action_version');
            $table->boolean('effective');
            $table->text('finding');
            $table->timestamp('reviewed_at')->useCurrent();
            $table->index(['officine_id', 'action_id', 'reviewed_at']);
        });
    }

    public function down(): void
    {
        foreach (['module4_effectiveness_reviews', 'module4_action_events', 'module4_action_evidence', 'module4_action_sources',
            'module4_actions', 'action_plan_versions', 'action_plans'] as $table) Schema::dropIfExists($table);
    }
};

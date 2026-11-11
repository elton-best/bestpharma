<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('support_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mission_id')->constrained('support_missions')->restrictOnDelete();
            $table->string('status', 24)->default('draft');
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->unique('mission_id');
            $table->index(['status', 'updated_at']);
        });

        Schema::create('support_plan_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('support_plans')->restrictOnDelete();
            $table->unsignedInteger('revision');
            $table->string('state', 24);
            $table->json('snapshot');
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('decision', 24)->nullable();
            $table->text('decision_reason')->nullable();
            $table->timestamps();
            $table->unique(['plan_id', 'revision']);
            $table->index(['plan_id', 'state']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_plan_versions');
        Schema::dropIfExists('support_plans');
    }
};

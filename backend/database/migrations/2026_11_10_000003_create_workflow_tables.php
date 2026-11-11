<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('workflow_definitions', function (Blueprint $t) { $t->id(); $t->foreignId('officine_id')->nullable()->constrained('officines')->nullOnDelete(); $t->string('code'); $t->string('name'); $t->string('subject_type')->nullable(); $t->boolean('is_active')->default(true); $t->timestamps(); $t->unique(['officine_id','code']); });
        Schema::create('workflow_steps', function (Blueprint $t) { $t->id(); $t->foreignId('workflow_definition_id')->constrained('workflow_definitions')->cascadeOnDelete(); $t->string('name'); $t->unsignedSmallInteger('position'); $t->string('approver_role')->nullable(); $t->foreignId('approver_user_id')->nullable()->constrained('users')->nullOnDelete(); $t->timestamps(); });
        Schema::create('workflow_instances', function (Blueprint $t) { $t->id(); $t->foreignId('workflow_definition_id')->constrained('workflow_definitions')->cascadeOnDelete(); $t->foreignId('officine_id')->nullable()->constrained('officines')->nullOnDelete(); $t->string('subject_type'); $t->unsignedBigInteger('subject_id'); $t->string('status')->default('pending'); $t->unsignedSmallInteger('current_step')->default(0); $t->timestamps(); });
        Schema::create('workflow_logs', function (Blueprint $t) { $t->id(); $t->foreignId('workflow_instance_id')->constrained('workflow_instances')->cascadeOnDelete(); $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete(); $t->string('action'); $t->json('payload')->nullable(); $t->timestamps(); });
    }
    public function down(): void { Schema::dropIfExists('workflow_logs'); Schema::dropIfExists('workflow_instances'); Schema::dropIfExists('workflow_steps'); Schema::dropIfExists('workflow_definitions'); }
};

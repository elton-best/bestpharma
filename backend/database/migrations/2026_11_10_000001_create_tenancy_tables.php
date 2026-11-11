<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('organizations', function (Blueprint $t) { $t->id(); $t->string('name'); $t->string('slug')->unique(); $t->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete(); $t->timestamps(); });
        Schema::create('officines', function (Blueprint $t) { $t->id(); $t->foreignId('organization_id')->nullable()->constrained('organizations')->nullOnDelete(); $t->string('name'); $t->string('slug')->unique(); $t->string('email')->nullable(); $t->string('phone')->nullable(); $t->string('ifu')->nullable(); $t->string('rccm')->nullable(); $t->string('devise',3)->default('XOF'); $t->string('status')->default('pending'); $t->boolean('onboarding_completed')->default(false); $t->unsignedSmallInteger('onboarding_step')->default(0); $t->timestamps(); $t->index(['status']); });
        Schema::create('officine_user', function (Blueprint $t) { $t->id(); $t->foreignId('officine_id')->constrained('officines')->cascadeOnDelete(); $t->foreignId('user_id')->constrained('users')->cascadeOnDelete(); $t->string('role_hint')->nullable(); $t->timestamps(); $t->unique(['officine_id','user_id']); });
        Schema::create('officine_modules', function (Blueprint $t) { $t->id(); $t->foreignId('officine_id')->constrained('officines')->cascadeOnDelete(); $t->string('module'); $t->boolean('is_active')->default(true); $t->timestamps(); $t->unique(['officine_id','module']); });
        Schema::create('officine_invitations', function (Blueprint $t) { $t->id(); $t->foreignId('officine_id')->constrained('officines')->cascadeOnDelete(); $t->string('email'); $t->string('token')->unique(); $t->json('roles')->nullable(); $t->timestamp('expires_at')->nullable(); $t->timestamp('accepted_at')->nullable(); $t->timestamps(); });
        Schema::create('tenant_audit_logs', function (Blueprint $t) { $t->id(); $t->foreignId('officine_id')->nullable()->constrained('officines')->nullOnDelete(); $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete(); $t->string('action'); $t->json('payload')->nullable(); $t->timestamps(); $t->index(['officine_id','created_at']); });
    }
    public function down(): void { Schema::dropIfExists('tenant_audit_logs'); Schema::dropIfExists('officine_invitations'); Schema::dropIfExists('officine_modules'); Schema::dropIfExists('officine_user'); Schema::dropIfExists('officines'); Schema::dropIfExists('organizations'); }
};

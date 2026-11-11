<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        // Spatie Permission + company_id (officine_id) pour rôles locaux — cf. ERPSAAS ACL
        Schema::create('roles', function (Blueprint $t) { $t->id(); $t->foreignId('officine_id')->nullable()->constrained('officines')->nullOnDelete(); $t->string('name'); $t->string('guard_name')->default('web'); $t->timestamps(); $t->unique(['officine_id','name','guard_name']); });
        Schema::create('permissions', function (Blueprint $t) { $t->id(); $t->string('name'); $t->string('guard_name')->default('web'); $t->timestamps(); $t->unique(['name','guard_name']); });
        Schema::create('model_has_roles', function (Blueprint $t) { $t->foreignId('role_id')->constrained('roles')->cascadeOnDelete(); $t->string('model_type'); $t->unsignedBigInteger('model_id'); $t->index(['model_id','model_type']); $t->primary(['role_id','model_id','model_type']); });
        Schema::create('model_has_permissions', function (Blueprint $t) { $t->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete(); $t->string('model_type'); $t->unsignedBigInteger('model_id'); $t->index(['model_id','model_type']); $t->primary(['permission_id','model_id','model_type']); });
        Schema::create('role_has_permissions', function (Blueprint $t) { $t->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete(); $t->foreignId('role_id')->constrained('roles')->cascadeOnDelete(); $t->primary(['permission_id','role_id']); });
    }
    public function down(): void { Schema::dropIfExists('role_has_permissions'); Schema::dropIfExists('model_has_permissions'); Schema::dropIfExists('model_has_roles'); Schema::dropIfExists('permissions'); Schema::dropIfExists('roles'); }
};

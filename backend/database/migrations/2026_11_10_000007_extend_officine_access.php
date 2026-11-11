<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(): void {
  Schema::table('users',function(Blueprint $t){$t->boolean('is_support_coordinator')->default(false);$t->boolean('is_support_staff')->default(false);$t->string('phone',40)->nullable();$t->unsignedInteger('profile_version')->default(1);});
  Schema::table('officines',function(Blueprint $t){$t->string('country',80)->default('Bénin');$t->string('department',120)->nullable();$t->string('contact_name',150)->nullable();$t->unsignedInteger('profile_version')->default(1);});
  Schema::create('officine_contacts',function(Blueprint $t){$t->id();$t->foreignId('officine_id')->constrained('officines')->restrictOnDelete();$t->string('name',150);$t->string('function',120);$t->string('phone',40)->nullable();$t->string('email',254)->nullable();$t->string('type',40)->default('professionnel');$t->boolean('is_active')->default(true);$t->unsignedInteger('version')->default(1);$t->timestamps();$t->index(['officine_id','is_active']);});
  Schema::create('officine_support_assignments',function(Blueprint $t){$t->id();$t->foreignId('officine_id')->constrained('officines')->restrictOnDelete();$t->foreignId('user_id')->constrained('users')->restrictOnDelete();$t->foreignId('proposed_by')->constrained('users')->restrictOnDelete();$t->foreignId('decided_by')->nullable()->constrained('users')->restrictOnDelete();$t->string('scope',150);$t->json('permissions');$t->date('starts_on');$t->date('ends_on');$t->string('status',20)->default('pending');$t->string('request_key',80);$t->text('decision_reason')->nullable();$t->timestamp('decided_at')->nullable();$t->unsignedInteger('version')->default(1);$t->timestamps();$t->unique(['officine_id','request_key']);$t->index(['officine_id','user_id','status']);});
 }
 public function down(): void {Schema::dropIfExists('officine_support_assignments');Schema::dropIfExists('officine_contacts');Schema::table('officines',fn(Blueprint $t)=>$t->dropColumn(['country','department','contact_name','profile_version']));Schema::table('users',fn(Blueprint $t)=>$t->dropColumn(['is_support_coordinator','is_support_staff','phone','profile_version']));}
};

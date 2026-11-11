<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
 public function up(): void {
  Schema::table('officine_user', function(Blueprint $t) { $t->boolean('is_admin')->default(false); $t->boolean('is_active')->default(true); });
  Schema::table('officine_invitations', fn(Blueprint $t) => $t->timestamp('revoked_at')->nullable());
  Schema::create('officine_roles', function(Blueprint $t) { $t->id(); $t->foreignId('officine_id')->constrained('officines')->cascadeOnDelete(); $t->string('name',80); $t->json('permissions'); $t->timestamps(); $t->unique(['officine_id','name']); });
  Schema::create('officine_member_roles', function(Blueprint $t) { $t->foreignId('membership_id')->constrained('officine_user')->cascadeOnDelete(); $t->foreignId('role_id')->constrained('officine_roles')->cascadeOnDelete(); $t->primary(['membership_id','role_id']); });
  // Only activated applicants are initial administrators. Legacy demo handled by seeder.
  foreach(DB::table('officines')->where('status','active')->whereNotNull('applicant_user_id')->get() as $o) {
   DB::table('officine_user')->where('officine_id',$o->id)->where('user_id',$o->applicant_user_id)->update(['is_admin'=>true]);
  }
 }
 public function down(): void {
  Schema::dropIfExists('officine_member_roles'); Schema::dropIfExists('officine_roles');
  Schema::table('officine_invitations',fn(Blueprint $t)=>$t->dropColumn('revoked_at'));
  Schema::table('officine_user',fn(Blueprint $t)=>$t->dropColumn(['is_admin','is_active']));
 }
};

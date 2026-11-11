<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {
  Schema::table('users',fn(Blueprint $t)=>$t->unsignedInteger('account_version')->default(1));
  Schema::table('officines',function(Blueprint $t){$t->string('logo_path')->nullable();$t->string('logo_sha256',64)->nullable();});
  Schema::create('mfa_recovery_codes',function(Blueprint $t){$t->id();$t->foreignId('user_id')->constrained('users')->cascadeOnDelete();$t->string('code_hash',64)->unique();$t->timestamp('used_at')->nullable();$t->timestamps();});
 }
 public function down():void {Schema::dropIfExists('mfa_recovery_codes');Schema::table('officines',fn(Blueprint $t)=>$t->dropColumn(['logo_path','logo_sha256']));Schema::table('users',fn(Blueprint $t)=>$t->dropColumn('account_version'));}
};

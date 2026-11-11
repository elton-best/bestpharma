<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void{
  Schema::create('support_mission_team',function(Blueprint $t){$t->id();$t->foreignId('mission_id')->constrained('support_missions')->restrictOnDelete();$t->foreignId('assignment_id')->constrained('officine_support_assignments')->restrictOnDelete();$t->string('role',20);$t->string('status',20)->default('pending');$t->unsignedInteger('version')->default(1);$t->foreignId('proposed_by')->constrained('users')->restrictOnDelete();$t->foreignId('decided_by')->nullable()->constrained('users')->restrictOnDelete();$t->text('reason')->nullable();$t->timestamps();$t->unique(['mission_id','assignment_id']);});
  Schema::create('support_mission_events',function(Blueprint $t){$t->id();$t->foreignId('mission_id')->constrained('support_missions')->restrictOnDelete();$t->foreignId('user_id')->constrained('users')->restrictOnDelete();$t->string('action',50);$t->unsignedInteger('version');$t->text('reason');$t->timestamp('created_at');$t->unique(['mission_id','version']);});
 }
 public function down():void{Schema::dropIfExists('support_mission_events');Schema::dropIfExists('support_mission_team');}
};

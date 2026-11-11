<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void{
  Schema::create('support_visits',function(Blueprint $t){$t->id();$t->foreignId('mission_id')->constrained('support_missions')->restrictOnDelete();$t->foreignId('previous_id')->nullable()->constrained('support_visits')->restrictOnDelete();$t->foreignId('created_by')->constrained('users')->restrictOnDelete();$t->foreignId('decided_by')->nullable()->constrained('users')->restrictOnDelete();$t->string('title',180);$t->string('mode',20);$t->string('place',500);$t->timestamp('starts_at');$t->timestamp('ends_at');$t->string('timezone',50)->default('Africa/Porto-Novo');$t->string('status',20)->default('draft');$t->timestamp('published_at')->nullable();$t->unsignedInteger('version')->default(1);$t->text('decision_reason')->nullable();$t->timestamps();$t->index(['mission_id','status']);});
  Schema::create('support_visit_reports',function(Blueprint $t){$t->id();$t->foreignId('visit_id')->constrained('support_visits')->restrictOnDelete();$t->foreignId('created_by')->constrained('users')->restrictOnDelete();$t->unsignedInteger('revision');$t->unsignedInteger('version')->default(1);$t->string('status',20)->default('draft');$t->timestamp('actual_starts_at');$t->timestamp('actual_ends_at');$t->text('attendance');$t->text('activities');$t->text('decisions');$t->text('next_steps');$t->timestamp('submitted_at')->nullable();$t->timestamp('shared_at')->nullable();$t->timestamps();$t->unique(['visit_id','revision']);});
 }
 public function down():void{Schema::dropIfExists('support_visit_reports');Schema::dropIfExists('support_visits');}
};

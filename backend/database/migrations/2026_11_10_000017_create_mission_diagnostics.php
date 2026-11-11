<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void{
  Schema::create('support_diagnostic_templates',function(Blueprint $t){$t->id();$t->foreignId('mission_id')->constrained('support_missions')->restrictOnDelete();$t->foreignId('parent_id')->nullable()->constrained('support_diagnostic_templates')->restrictOnDelete();$t->string('family_key',80);$t->unsignedInteger('revision');$t->unsignedInteger('version')->default(1);$t->string('request_key',80);$t->string('fingerprint',64);$t->string('title',180);$t->json('questions');$t->string('status',20)->default('draft');$t->foreignId('created_by')->constrained('users')->restrictOnDelete();$t->timestamp('published_at')->nullable();$t->timestamps();$t->unique(['mission_id','family_key','revision'],'diagnostic_template_revision');$t->unique(['mission_id','request_key'],'diagnostic_template_request');});
  Schema::create('support_diagnostics',function(Blueprint $t){$t->id();$t->foreignId('mission_id')->constrained('support_missions')->restrictOnDelete();$t->foreignId('template_id')->constrained('support_diagnostic_templates')->restrictOnDelete();$t->foreignId('previous_id')->nullable()->constrained('support_diagnostics')->restrictOnDelete();$t->unsignedInteger('revision')->default(1);$t->unsignedInteger('version')->default(1);$t->string('request_key',80);$t->string('fingerprint',64);$t->string('type',20);$t->date('assessed_on');$t->json('template_snapshot');$t->json('answers');$t->string('status',20)->default('draft');$t->foreignId('created_by')->constrained('users')->restrictOnDelete();$t->timestamp('submitted_at')->nullable();$t->timestamp('shared_at')->nullable();$t->timestamps();$t->unique(['mission_id','request_key'],'diagnostic_request');});
 }
 public function down():void{Schema::dropIfExists('support_diagnostics');Schema::dropIfExists('support_diagnostic_templates');}
};

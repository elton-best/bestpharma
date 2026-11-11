<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void{Schema::create('support_findings',function(Blueprint $t){$t->id();$t->foreignId('mission_id')->constrained('support_missions')->restrictOnDelete();$t->foreignId('diagnostic_id')->constrained('support_diagnostics')->restrictOnDelete();$t->string('question_key',80);$t->json('source_snapshot');$t->string('title',180);$t->text('fact');$t->string('category',40);$t->text('presumed_cause')->nullable();$t->text('recommendation')->nullable();$t->date('observed_on');$t->string('status',20)->default('draft');$t->unsignedInteger('version')->default(1);$t->string('request_key',80);$t->string('fingerprint',64);$t->foreignId('created_by')->constrained('users')->restrictOnDelete();$t->timestamp('shared_at')->nullable();$t->timestamps();$t->unique(['mission_id','request_key'],'finding_request');});}
 public function down():void{Schema::dropIfExists('support_findings');}
};

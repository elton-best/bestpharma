<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void{Schema::create('support_missions',function(Blueprint $t){$t->id();$t->foreignId('support_request_id')->unique()->constrained('support_requests')->restrictOnDelete();$t->foreignId('proposed_by')->constrained('users')->restrictOnDelete();$t->string('title',180);$t->text('scope');$t->date('starts_on');$t->date('ends_on');$t->string('status',20)->default('proposed');$t->unsignedInteger('version')->default(1);$t->foreignId('decided_by')->nullable()->constrained('users')->restrictOnDelete();$t->text('decision_reason')->nullable();$t->timestamp('decided_at')->nullable();$t->timestamps();});}
 public function down():void{Schema::dropIfExists('support_missions');}
};

<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void{Schema::create('support_requests',function(Blueprint $t){$t->id();$t->foreignId('officine_id')->constrained('officines')->restrictOnDelete();$t->foreignId('created_by')->constrained('users')->restrictOnDelete();$t->string('reference',50)->unique();$t->string('request_key',80);$t->string('title',180)->nullable();$t->text('description')->nullable();$t->string('contact',180)->nullable();$t->string('theme',120)->nullable();$t->string('availability',250)->nullable();$t->string('urgency',20)->default('normal');$t->string('status',30)->default('draft');$t->unsignedInteger('version')->default(1);$t->timestamp('submitted_at')->nullable();$t->text('withdrawal_reason')->nullable();$t->timestamps();$t->unique(['officine_id','request_key']);$t->index(['officine_id','status']);});}
 public function down():void{Schema::dropIfExists('support_requests');}
};

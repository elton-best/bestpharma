<?php
declare(strict_types=1);
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(): void { Schema::create('pharmacy_guards', function(Blueprint $t){$t->id();$t->unsignedBigInteger('officine_id')->index();$t->string('pharmacy_name',180);$t->string('phone',40)->nullable();$t->string('address',255)->nullable();$t->timestamp('starts_at');$t->timestamp('ends_at');$t->string('reason',500)->nullable();$t->unsignedBigInteger('recorded_by');$t->timestamps();$t->index(['officine_id','starts_at','ends_at']);}); }
 public function down(): void { Schema::dropIfExists('pharmacy_guards'); }
};

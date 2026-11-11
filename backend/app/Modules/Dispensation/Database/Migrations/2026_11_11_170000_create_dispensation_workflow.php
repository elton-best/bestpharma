<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up(): void {
  Schema::create('dispensation_requests', function (Blueprint $t) {
   $t->id(); $t->foreignId('officine_id')->constrained('officines')->restrictOnDelete();
   $t->foreignId('created_by')->constrained('users')->restrictOnDelete(); $t->string('request_key',80); $t->string('fingerprint',64);
   $t->string('kind',20); $t->string('prescription_reference',120)->nullable(); $t->date('prescription_date')->nullable();
   $t->text('patient_reference')->nullable(); $t->string('status',20)->default('pending_review');
   $t->foreignId('dispensed_by')->nullable()->constrained('users')->restrictOnDelete(); $t->foreignId('visa_by')->nullable()->constrained('users')->restrictOnDelete();
   $t->timestamp('dispensed_at')->nullable(); $t->string('dispense_key',80)->nullable(); $t->timestamps();
   $t->unique(['officine_id','request_key']); $t->unique(['officine_id','dispense_key']); $t->unique(['id','officine_id']);
  });
  Schema::create('dispensation_request_lines', function (Blueprint $t) {
   $t->id(); $t->foreignId('officine_id')->constrained('officines')->restrictOnDelete(); $t->unsignedBigInteger('request_id');
   $t->unsignedBigInteger('product_id'); $t->unsignedInteger('quantity'); $t->string('dosage_instructions',500)->nullable(); $t->timestamps();
   $t->foreign(['request_id','officine_id'])->references(['id','officine_id'])->on('dispensation_requests')->restrictOnDelete();
   $t->foreign(['product_id','officine_id'])->references(['id','officine_id'])->on('stock_products')->restrictOnDelete();
   $t->unique(['id','officine_id']);
  });
  Schema::create('dispensation_movements', function (Blueprint $t) {
   $t->id(); $t->foreignId('officine_id')->constrained('officines')->restrictOnDelete(); $t->unsignedBigInteger('request_id');
   $t->unsignedBigInteger('request_line_id'); $t->unsignedBigInteger('balance_id'); $t->unsignedBigInteger('batch_id');
   $t->foreignId('user_id')->constrained('users')->restrictOnDelete(); $t->unsignedInteger('quantity'); $t->string('request_key',80); $t->timestamp('created_at');
   $t->unique(['officine_id','request_key']);
   $t->foreign(['request_id','officine_id'])->references(['id','officine_id'])->on('dispensation_requests')->restrictOnDelete();
   $t->foreign(['balance_id','officine_id'])->references(['id','officine_id'])->on('stock_balances')->restrictOnDelete();
   $t->foreign(['batch_id','officine_id'])->references(['id','officine_id'])->on('stock_batches')->restrictOnDelete();
   $t->foreign(['request_line_id','officine_id'])->references(['id','officine_id'])->on('dispensation_request_lines')->restrictOnDelete();
  });
  if (DB::getDriverName()==='pgsql') DB::statement('ALTER TABLE dispensation_request_lines ADD CONSTRAINT dispensation_quantity_positive CHECK (quantity > 0)');
 }
 public function down(): void { Schema::dropIfExists('dispensation_movements'); Schema::dropIfExists('dispensation_request_lines'); Schema::dropIfExists('dispensation_requests'); }
};

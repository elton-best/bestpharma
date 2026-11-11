<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void{
  Schema::create('stock_workspaces',function(Blueprint $t){$t->foreignId('officine_id')->primary()->constrained('officines')->restrictOnDelete();$t->unsignedInteger('revision')->default(0);});
  Schema::create('stock_products',function(Blueprint $t){$t->id();$t->foreignId('officine_id')->constrained('officines')->restrictOnDelete();$t->string('name',180);$t->string('code',180);$t->string('unit',80);$t->unsignedInteger('threshold')->default(0);$t->timestamps();$t->unique(['officine_id','code']);$t->unique(['id','officine_id']);});
  Schema::create('stock_locations',function(Blueprint $t){$t->id();$t->foreignId('officine_id')->constrained('officines')->restrictOnDelete();$t->string('name',180);$t->timestamps();$t->unique(['officine_id','name']);$t->unique(['id','officine_id']);});
  Schema::create('stock_batches',function(Blueprint $t){$t->id();$t->foreignId('officine_id')->constrained('officines')->restrictOnDelete();$t->unsignedBigInteger('product_id');$t->string('batch',180);$t->date('expiry');$t->unsignedBigInteger('unit_cost');$t->string('status',20)->default('quarantine');$t->timestamps();$t->unique(['officine_id','product_id','batch']);$t->unique(['id','officine_id']);$t->foreign(['product_id','officine_id'])->references(['id','officine_id'])->on('stock_products')->restrictOnDelete();});
  Schema::create('stock_balances',function(Blueprint $t){$t->id();$t->foreignId('officine_id')->constrained('officines')->restrictOnDelete();$t->unsignedBigInteger('batch_id');$t->unsignedBigInteger('location_id');$t->unsignedInteger('quantity')->default(0);$t->timestamps();$t->unique(['officine_id','batch_id','location_id']);$t->unique(['id','officine_id']);$t->foreign(['batch_id','officine_id'])->references(['id','officine_id'])->on('stock_batches')->restrictOnDelete();$t->foreign(['location_id','officine_id'])->references(['id','officine_id'])->on('stock_locations')->restrictOnDelete();});
  Schema::create('stock_operations',function(Blueprint $t){$t->id();$t->foreignId('officine_id')->constrained('officines')->restrictOnDelete();$t->foreignId('user_id')->constrained('users')->restrictOnDelete();$t->string('request_key',80);$t->string('fingerprint',64);$t->string('type',30);$t->unsignedBigInteger('balance_id')->nullable();$t->unsignedBigInteger('target_balance_id')->nullable();$t->bigInteger('quantity')->default(0);$t->text('reason');$t->unsignedInteger('revision');$t->timestamp('created_at');$t->unique(['officine_id','request_key']);$t->unique(['officine_id','revision']);$t->foreign(['balance_id','officine_id'])->references(['id','officine_id'])->on('stock_balances')->restrictOnDelete();$t->foreign(['target_balance_id','officine_id'])->references(['id','officine_id'])->on('stock_balances')->restrictOnDelete();});
  if(DB::getDriverName()==='pgsql'){
   DB::statement('ALTER TABLE stock_balances ADD CONSTRAINT stock_quantity_nonnegative CHECK (quantity >= 0)');
   DB::statement('ALTER TABLE stock_batches ADD CONSTRAINT stock_cost_nonnegative CHECK (unit_cost >= 0)');
   DB::statement("ALTER TABLE stock_batches ADD CONSTRAINT stock_batch_status CHECK (status IN ('available','quarantine','recalled'))");
  }elseif(DB::getDriverName()==='sqlite'){
   foreach(['INSERT','UPDATE'] as $event)DB::statement("CREATE TRIGGER stock_nonnegative_".strtolower($event)." BEFORE $event ON stock_balances WHEN NEW.quantity < 0 BEGIN SELECT RAISE(ABORT, 'negative stock'); END");
  }
 }
 public function down():void{foreach(['stock_operations','stock_balances','stock_batches','stock_locations','stock_products','stock_workspaces'] as $name)Schema::dropIfExists($name);}
};

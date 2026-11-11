<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('stock_products', function (Blueprint $t): void { $t->unsignedBigInteger('sale_price')->nullable(); });
        Schema::create('pos_sessions', function (Blueprint $t): void {
            $t->id(); $t->foreignId('officine_id')->constrained('officines')->restrictOnDelete();
            $t->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $t->unsignedBigInteger('opening_cash'); $t->unsignedBigInteger('closing_cash')->nullable();
            $t->bigInteger('cash_sales')->default(0); $t->bigInteger('cash_difference')->nullable();
            $t->string('status', 12)->default('open'); $t->text('closing_note')->nullable();
            $t->timestamp('opened_at'); $t->timestamp('closed_at')->nullable(); $t->timestamps();
            $t->index(['officine_id','status']); $t->unique(['id','officine_id']);
        });
        Schema::create('pos_sales', function (Blueprint $t): void {
            $t->id(); $t->foreignId('officine_id')->constrained('officines')->restrictOnDelete();
            $t->foreignId('session_id')->constrained('pos_sessions')->restrictOnDelete();
            $t->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $t->string('request_key',80); $t->string('fingerprint',64); $t->string('receipt_number',40);
            $t->string('customer_name',180)->nullable(); $t->unsignedBigInteger('total');
            $t->unsignedBigInteger('cash_received'); $t->unsignedBigInteger('change_due');
            $t->string('status',20)->default('completed'); $t->timestamp('sold_at'); $t->timestamps();
            $t->unique(['officine_id','request_key']); $t->unique(['officine_id','receipt_number']);
            $t->unique(['id','officine_id']);
            $t->foreign(['session_id','officine_id'])->references(['id','officine_id'])->on('pos_sessions')->restrictOnDelete();
        });
        Schema::create('pos_sale_lines', function (Blueprint $t): void {
            $t->id(); $t->foreignId('officine_id')->constrained('officines')->restrictOnDelete();
            $t->foreignId('sale_id')->constrained('pos_sales')->restrictOnDelete();
            $t->unsignedBigInteger('product_id'); $t->unsignedBigInteger('batch_id'); $t->unsignedBigInteger('balance_id');
            $t->unsignedInteger('quantity'); $t->unsignedBigInteger('unit_price'); $t->unsignedBigInteger('line_total'); $t->timestamps();
            $t->foreign(['product_id','officine_id'])->references(['id','officine_id'])->on('stock_products')->restrictOnDelete();
            $t->foreign(['sale_id','officine_id'])->references(['id','officine_id'])->on('pos_sales')->restrictOnDelete();
            $t->foreign(['batch_id','officine_id'])->references(['id','officine_id'])->on('stock_batches')->restrictOnDelete();
            $t->foreign(['balance_id','officine_id'])->references(['id','officine_id'])->on('stock_balances')->restrictOnDelete();
        });
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE pos_sessions ADD CONSTRAINT pos_session_status CHECK (status IN ('open','closed'))");
            DB::statement("ALTER TABLE pos_sales ADD CONSTRAINT pos_sales_cash CHECK (cash_received >= total AND change_due = cash_received - total)");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_sale_lines'); Schema::dropIfExists('pos_sales'); Schema::dropIfExists('pos_sessions');
        Schema::table('stock_products', function (Blueprint $t): void { $t->dropColumn('sale_price'); });
    }
};

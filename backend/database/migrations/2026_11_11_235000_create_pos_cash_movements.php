<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pos_cash_movements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->restrictOnDelete();
            $table->foreignId('session_id')->constrained('pos_sessions')->restrictOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('direction', 8);
            $table->string('category', 32);
            $table->string('reason', 500);
            $table->unsignedBigInteger('amount');
            $table->timestamp('occurred_at');
            $table->timestamps();
            $table->index(['officine_id', 'session_id', 'occurred_at']);
            $table->foreign(['session_id', 'officine_id'])->references(['id', 'officine_id'])->on('pos_sessions')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_cash_movements');
    }
};

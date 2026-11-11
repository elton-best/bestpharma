<?php
declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('temperature_records', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('zone', 40);
            $table->decimal('temperature', 7, 2);
            $table->decimal('minimum', 7, 2)->nullable();
            $table->decimal('maximum', 7, 2)->nullable();
            $table->decimal('humidity', 7, 2)->nullable();
            $table->dateTimeTz('measured_at');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('conformity_status', 30);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['officine_id', 'zone', 'measured_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('temperature_records'); }
};

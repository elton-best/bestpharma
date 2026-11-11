<?php
declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('officine_authorized_devices', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('type', 50);
            $table->char('fingerprint_hash', 64);
            $table->boolean('is_attendance_terminal')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->unique(['officine_id', 'fingerprint_hash']);
            $table->index(['officine_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('officine_authorized_devices');
    }
};

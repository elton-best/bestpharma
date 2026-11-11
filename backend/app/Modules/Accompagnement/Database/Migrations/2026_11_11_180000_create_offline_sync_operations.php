<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offline_sync_operations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->restrictOnDelete();
            $table->uuid('operation_id');
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('resource_id')->constrained('support_requests')->restrictOnDelete();
            $table->char('fingerprint', 64);
            // Keep the exact client-supplied representation; it is not server evidence.
            $table->string('client_timestamp', 64);
            $table->timestampTz('server_received_at');
            $table->timestamps();
            $table->unique(['officine_id', 'operation_id']);
            $table->index(['officine_id', 'server_received_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offline_sync_operations');
    }
};

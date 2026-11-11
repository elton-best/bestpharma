<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('pos_sessions', function (Blueprint $table): void {
            $table->string('open_request_key', 80)->nullable();
            $table->string('open_fingerprint', 64)->nullable();
            $table->string('close_request_key', 80)->nullable();
            $table->string('close_fingerprint', 64)->nullable();
            $table->unique(['officine_id', 'open_request_key'], 'pos_session_open_request');
        });
    }

    public function down(): void
    {
        Schema::table('pos_sessions', function (Blueprint $table): void {
            $table->dropUnique('pos_session_open_request');
            $table->dropColumn(['open_request_key', 'open_fingerprint', 'close_request_key', 'close_fingerprint']);
        });
    }
};

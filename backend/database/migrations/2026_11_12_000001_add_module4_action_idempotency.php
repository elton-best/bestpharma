<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('module4_actions', function (Blueprint $table): void {
            $table->string('request_key', 80)->nullable();
            $table->char('request_fingerprint', 64)->nullable();
            $table->unique(['officine_id', 'request_key']);
        });
    }

    public function down(): void
    {
        Schema::table('module4_actions', function (Blueprint $table): void {
            $table->dropUnique(['officine_id', 'request_key']);
            $table->dropColumn(['request_key', 'request_fingerprint']);
        });
    }
};

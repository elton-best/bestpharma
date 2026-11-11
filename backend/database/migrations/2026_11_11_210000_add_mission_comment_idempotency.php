<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('support_mission_comments', function (Blueprint $table) {
            $table->string('request_key', 80)->nullable();
            $table->string('fingerprint', 64)->nullable();
            $table->unique(['mission_id', 'request_key']);
        });
    }

    public function down(): void
    {
        Schema::table('support_mission_comments', function (Blueprint $table) {
            $table->dropUnique(['mission_id', 'request_key']);
            $table->dropColumn(['request_key', 'fingerprint']);
        });
    }
};

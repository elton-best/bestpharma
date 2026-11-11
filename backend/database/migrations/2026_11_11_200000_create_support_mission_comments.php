<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('support_mission_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mission_id')->constrained('support_missions')->restrictOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('visibility', 12);
            $table->text('message');
            $table->timestamp('shared_at')->nullable();
            $table->timestamps();
            $table->index(['mission_id', 'visibility', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_mission_comments');
    }
};

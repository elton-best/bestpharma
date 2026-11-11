<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Explicit permissions per membership, until custom role management is implemented.
        Schema::table('officine_user', function (Blueprint $table) {
            $table->json('permissions')->nullable();
        });
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });
        Schema::create('quality_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('title', 180);
            $table->string('chapter', 120);
            $table->string('severity', 12);
            $table->string('owner', 120);
            $table->date('due_date');
            $table->string('status', 20)->default('open');
            $table->text('description');
            $table->text('resolution')->nullable();
            $table->timestamps();
            $table->index(['officine_id', 'status', 'due_date']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('quality_actions');
        Schema::dropIfExists('personal_access_tokens');
        Schema::table('officine_user', fn (Blueprint $table) => $table->dropColumn('permissions'));
    }
};

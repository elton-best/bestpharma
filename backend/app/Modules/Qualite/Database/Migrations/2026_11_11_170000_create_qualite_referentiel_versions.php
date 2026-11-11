<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('qualite_referentiel_versions', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 80);
            $table->string('version', 80);
            $table->string('status', 24)->default('draft');
            $table->string('source_label', 255)->nullable();
            $table->string('source_sha256', 64)->nullable();
            $table->timestamp('validated_at')->nullable();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['code', 'version']);
            $table->index(['status', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qualite_referentiel_versions');
    }
};

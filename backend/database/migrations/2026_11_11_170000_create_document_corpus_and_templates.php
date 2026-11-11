<?php
declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('document_sources', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('source_kind', 24); // corpus | bpd
            $table->string('original_name');
            $table->string('private_path');
            $table->string('mime', 120)->nullable();
            $table->unsignedBigInteger('bytes');
            $table->char('sha256', 64);
            $table->string('provenance', 500);
            $table->string('status', 24)->default('quarantine');
            $table->string('document_code')->nullable();
            $table->string('document_kind', 32)->nullable();
            $table->string('process', 80)->nullable();
            $table->text('qualification_note')->nullable();
            $table->foreignId('imported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('qualified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('qualified_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->unique(['officine_id', 'source_kind', 'sha256']);
            $table->index(['officine_id', 'status']);
        });

        Schema::create('document_template_versions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('source_id')->constrained('document_sources')->restrictOnDelete();
            $table->string('name');
            $table->unsignedInteger('version')->default(1);
            $table->json('fields');
            $table->char('sha256', 64);
            $table->string('status', 24)->default('draft');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->unique(['source_id', 'version']);
            $table->index(['officine_id', 'status']);
        });

        Schema::create('document_source_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('source_id')->constrained('document_sources')->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 32);
            $table->timestamp('created_at')->useCurrent();
            $table->index(['officine_id', 'source_id', 'created_at']);
        });

        Schema::create('document_followups', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('category', 24); // formation | maintenance
            $table->string('status', 24)->default('planned');
            $table->unsignedInteger('version')->default(1);
            $table->json('data');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['officine_id', 'category', 'status']);
        });
        Schema::create('document_followup_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('followup_id')->constrained('document_followups')->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('version');
            $table->json('snapshot');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['officine_id', 'followup_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_followup_events');
        Schema::dropIfExists('document_followups');
        Schema::dropIfExists('document_source_events');
        Schema::dropIfExists('document_template_versions');
        Schema::dropIfExists('document_sources');
    }
};

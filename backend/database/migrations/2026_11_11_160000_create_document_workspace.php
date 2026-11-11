<?php
declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table): void {
            $table->id(); $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('title'); $table->string('kind', 32); $table->string('process', 80)->nullable();
            $table->string('status', 24)->default('draft'); $table->unsignedInteger('version')->default(1);
            $table->longText('content'); $table->char('sha256', 64); $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(); $table->index(['officine_id', 'status']);
        });
        Schema::create('document_approvals', function (Blueprint $table): void {
            $table->id(); $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete(); $table->unsignedInteger('version');
            $table->foreignId('approved_by')->constrained('users'); $table->char('sha256', 64); $table->timestamp('approved_at');
            $table->unique(['document_id', 'version']);
        });
        Schema::create('document_attachments', function (Blueprint $table): void {
            $table->id(); $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete(); $table->unsignedInteger('version');
            $table->string('name'); $table->string('path'); $table->string('mime', 120); $table->unsignedBigInteger('bytes');
            $table->char('sha256', 64); $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete(); $table->timestamps();
        });
        Schema::create('document_audit_events', function (Blueprint $table): void {
            $table->id(); $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete(); $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 40); $table->unsignedInteger('version'); $table->timestamp('created_at')->useCurrent();
            $table->index(['officine_id','document_id','created_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('document_audit_events'); Schema::dropIfExists('document_attachments'); Schema::dropIfExists('document_approvals'); Schema::dropIfExists('documents'); }
};

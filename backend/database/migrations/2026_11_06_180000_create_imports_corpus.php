<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('imports_corpus', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->constrained('officines')->restrictOnDelete();
            $table->string('manifeste_sha256', 64);
            $table->foreignUuid('operateur_id')->constrained('users')->restrictOnDelete();
            $table->jsonb('manifeste');
            $table->jsonb('bilan');
            $table->timestampTz('importe_le');
            $table->unique(['officine_id', 'manifeste_sha256']);
        });
        Schema::create('imports_corpus_fichiers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->constrained('officines')->restrictOnDelete();
            $table->string('cle_source', 64);
            $table->text('chemin_source');
            $table->foreignUuid('document_id')->constrained('documents')->restrictOnDelete();
            $table->foreignUuid('fichier_id')->constrained('fichiers_documents')->restrictOnDelete();
            $table->unique(['officine_id', 'cle_source']);
        });
        foreach (['imports_corpus', 'imports_corpus_fichiers'] as $table) {
            DB::unprepared("ALTER TABLE public.{$table} ENABLE ROW LEVEL SECURITY;
                CREATE POLICY p_{$table}_isolation ON public.{$table} FOR ALL
                USING (NULLIF(current_setting('app.current_user_id', true), '') IS NULL
                OR officine_id IN (SELECT public.user_officines()));
                CREATE TRIGGER trg_{$table}_immuable BEFORE UPDATE OR DELETE ON public.{$table}
                    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_tampering();
                CREATE TRIGGER trg_{$table}_no_truncate BEFORE TRUNCATE ON public.{$table}
                    FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_tampering();
                CREATE TRIGGER trg_audit_{$table} AFTER INSERT ON public.{$table}
                    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('imports_corpus_fichiers');
        Schema::dropIfExists('imports_corpus');
    }
};

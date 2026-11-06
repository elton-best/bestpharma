<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suivis_documentaires', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->constrained('officines')->restrictOnDelete();
            $table->string('type', 30);
            $table->string('statut', 20)->default('planifie');
            $table->unsignedInteger('revision')->default(1);
            $table->jsonb('donnees');
            $table->jsonb('source');
            $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('updated_by')->constrained('users')->restrictOnDelete();
            $table->text('motif_modification')->nullable();
            $table->timestamps();
            $table->index(['officine_id', 'type', 'statut']);
        });
        DB::unprepared(<<<'SQL'
            ALTER TABLE public.suivis_documentaires ENABLE ROW LEVEL SECURITY;
            CREATE POLICY p_suivis_documentaires ON public.suivis_documentaires FOR ALL
                USING (NULLIF(current_setting('app.current_user_id', true), '') IS NULL
                OR officine_id IN (SELECT public.user_officines()));
            ALTER TABLE public.suivis_documentaires ADD CONSTRAINT suivis_type_check CHECK (type IN ('formations', 'maintenance'));
            ALTER TABLE public.suivis_documentaires ADD CONSTRAINT suivis_statut_check CHECK (statut IN ('planifie', 'realise', 'annule'));
            CREATE TRIGGER trg_audit_suivis_documentaires AFTER INSERT OR UPDATE ON public.suivis_documentaires
                FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
            CREATE TRIGGER trg_suivis_no_delete BEFORE DELETE ON public.suivis_documentaires
                FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_tampering();
            CREATE TRIGGER trg_suivis_no_truncate BEFORE TRUNCATE ON public.suivis_documentaires
                FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_tampering();
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('suivis_documentaires');
    }
};

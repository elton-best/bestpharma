<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('approbations_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // Pas de cascade : une suppression métier ne doit pas effacer une approbation.
            $table->foreignUuid('officine_id')->constrained('officines')->restrictOnDelete();
            $table->foreignUuid('document_id')->constrained('documents')->restrictOnDelete();
            $table->unsignedInteger('version');
            $table->unsignedInteger('indice_revision');
            $table->foreignUuid('signataire_id')->constrained('users')->restrictOnDelete();
            $table->string('signataire_nom');
            $table->string('role_code');
            $table->string('methode')->default('mot_de_passe_compte');
            $table->string('intention')->default('approbation_documentaire');
            $table->text('contenu_signe');
            $table->string('empreinte_contenu', 64);
            $table->timestampTz('approuve_le');
            $table->unique(['document_id', 'version', 'indice_revision']);
        });
        DB::unprepared(<<<'SQL'
            CREATE FUNCTION public.guard_document_approval() RETURNS trigger
            LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    IF OLD.statut IN ('valide', 'retire') THEN
                        RAISE EXCEPTION 'Une version approuvée ne peut pas être supprimée';
                    END IF;
                    RETURN OLD;
                END IF;
                IF TG_OP = 'UPDATE' AND OLD.statut IN ('valide', 'retire') THEN
                    IF NEW.statut <> 'brouillon' OR NEW.version <> OLD.version + 1
                       OR NEW.indice_revision <> OLD.indice_revision + 1
                       OR NEW.titre IS DISTINCT FROM OLD.titre OR NEW.contenu IS DISTINCT FROM OLD.contenu
                       OR NEW.type_doc IS DISTINCT FROM OLD.type_doc OR NEW.processus IS DISTINCT FROM OLD.processus
                       OR NEW.code_document IS DISTINCT FROM OLD.code_document
                       OR NEW.officine_id IS DISTINCT FROM OLD.officine_id THEN
                        RAISE EXCEPTION 'Ouvrir une nouvelle révision avant de modifier une version approuvée';
                    END IF;
                END IF;
                IF NEW.statut = 'valide' AND NOT EXISTS (
                    SELECT 1 FROM public.approbations_documents a
                    WHERE a.document_id = NEW.id AND a.officine_id = NEW.officine_id
                      AND a.version = NEW.version AND a.indice_revision = NEW.indice_revision
                      AND a.empreinte_contenu = encode(pg_catalog.sha256(convert_to(a.contenu_signe, 'UTF8')), 'hex')
                      AND a.contenu_signe::jsonb = jsonb_build_object(
                        'id', NEW.id, 'officine_id', NEW.officine_id, 'titre', NEW.titre,
                        'code_document', NEW.code_document, 'type_doc', NEW.type_doc, 'processus', NEW.processus,
                        'version', NEW.version, 'indice_revision', NEW.indice_revision,
                        'contenu', COALESCE(NEW.contenu, ''))
                ) THEN
                    RAISE EXCEPTION 'Approbation enregistrée manquante ou différente du contenu';
                END IF;
                RETURN NEW;
            END;
            $$;
            CREATE TRIGGER trg_guard_document_approval BEFORE INSERT OR UPDATE OR DELETE
                ON public.documents FOR EACH ROW EXECUTE FUNCTION public.guard_document_approval();
            ALTER TABLE public.approbations_documents ENABLE ROW LEVEL SECURITY;
            CREATE POLICY p_approbations_isolation ON public.approbations_documents FOR ALL
            USING (NULLIF(current_setting('app.current_user_id', true), '') IS NULL
                OR officine_id IN (SELECT public.user_officines()));
            CREATE TRIGGER trg_approbations_immutables BEFORE UPDATE OR DELETE
                ON public.approbations_documents FOR EACH ROW
                EXECUTE FUNCTION public.prevent_audit_tampering();
            CREATE TRIGGER trg_approbations_no_truncate BEFORE TRUNCATE
                ON public.approbations_documents FOR EACH STATEMENT
                EXECUTE FUNCTION public.prevent_audit_tampering();
            CREATE TRIGGER trg_audit_approbations AFTER INSERT ON public.approbations_documents
                FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
        SQL);
    }

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS trg_guard_document_approval ON public.documents; DROP FUNCTION IF EXISTS public.guard_document_approval();');
        Schema::dropIfExists('approbations_documents');
    }
};

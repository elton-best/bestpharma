<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fichiers_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->constrained('officines')->restrictOnDelete();
            $table->foreignUuid('document_id')->constrained('documents')->restrictOnDelete();
            $table->unsignedInteger('version_document');
            $table->unsignedInteger('indice_revision');
            $table->unsignedInteger('numero');
            $table->string('nom_original');
            $table->string('mime');
            $table->unsignedBigInteger('octets');
            $table->string('sha256', 64);
            $table->string('chemin')->unique();
            $table->foreignUuid('depose_par')->constrained('users')->restrictOnDelete();
            $table->timestampTz('depose_le');
            $table->date('conserver_jusqu_au');
            $table->unique(['document_id', 'numero']);
        });
        DB::unprepared(<<<'SQL'
            ALTER TABLE public.fichiers_documents ENABLE ROW LEVEL SECURITY;
            CREATE POLICY p_fichiers_documents_isolation ON public.fichiers_documents FOR ALL
                USING (NULLIF(current_setting('app.current_user_id', true), '') IS NULL
                OR officine_id IN (SELECT public.user_officines()));
            CREATE FUNCTION public.guard_document_file_insert() RETURNS trigger
            LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
            DECLARE doc public.documents%ROWTYPE;
            BEGIN
                SELECT * INTO doc FROM public.documents WHERE id = NEW.document_id FOR UPDATE;
                IF NOT FOUND OR doc.archived OR doc.officine_id <> NEW.officine_id
                   OR doc.statut NOT IN ('brouillon', 'a_valider')
                   OR doc.version <> NEW.version_document OR doc.indice_revision <> NEW.indice_revision THEN
                    RAISE EXCEPTION 'Dépôt interdit pour cette version documentaire';
                END IF;
                RETURN NEW;
            END;
            $$;
            CREATE TRIGGER trg_guard_document_file_insert BEFORE INSERT ON public.fichiers_documents
                FOR EACH ROW EXECUTE FUNCTION public.guard_document_file_insert();
            CREATE TRIGGER trg_fichiers_documents_immutables BEFORE UPDATE OR DELETE ON public.fichiers_documents
                FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_tampering();
            CREATE TRIGGER trg_fichiers_documents_no_truncate BEFORE TRUNCATE ON public.fichiers_documents
                FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_tampering();
            CREATE TRIGGER trg_audit_fichiers_documents AFTER INSERT ON public.fichiers_documents
                FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
        SQL);
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION public.guard_document_approval() RETURNS trigger
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
                        'contenu', COALESCE(NEW.contenu, ''),
                        'fichiers', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                            'id', f.id, 'numero', f.numero, 'nom_original', f.nom_original,
                            'mime', f.mime, 'octets', f.octets, 'sha256', f.sha256) ORDER BY f.numero), '[]'::jsonb)
                            FROM public.fichiers_documents f WHERE f.document_id = NEW.id
                            AND f.officine_id = NEW.officine_id AND f.version_document = NEW.version
                            AND f.indice_revision = NEW.indice_revision))
                ) THEN
                    RAISE EXCEPTION 'Approbation enregistrée manquante ou différente du contenu';
                END IF;
                RETURN NEW;
            END;
            $$;
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION public.guard_document_approval() RETURNS trigger
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
        SQL);
        DB::unprepared('DROP FUNCTION IF EXISTS public.guard_document_file_insert() CASCADE;');
        Schema::dropIfExists('fichiers_documents');
    }
};

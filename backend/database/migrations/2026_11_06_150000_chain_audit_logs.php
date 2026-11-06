<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            DECLARE
                v_user_id UUID;
                v_user_email TEXT;
                v_ip TEXT;
                v_device_id TEXT;
                v_user_agent TEXT;
                v_officine_id UUID;
                v_record_id TEXT;
                v_old_data JSONB := NULL;
                v_new_data JSONB := NULL;
            BEGIN
                -- Extraction des contextes de session positionnés par le middleware Laravel
                BEGIN
                    v_user_id := NULLIF(current_setting('app.current_user_id', true), '')::uuid;
                EXCEPTION WHEN OTHERS THEN
                    v_user_id := NULL;
                END;

                v_user_email := NULLIF(current_setting('app.current_user_email', true), '');
                v_ip := NULLIF(current_setting('app.current_ip', true), '');
                v_device_id := NULLIF(current_setting('app.current_device_id', true), '');
                v_user_agent := NULLIF(current_setting('app.current_user_agent', true), '');

                IF TG_OP = 'INSERT' THEN
                    v_record_id := NEW.id::text;
                    v_new_data := to_jsonb(NEW);
                    IF TG_TABLE_NAME = 'officines' THEN
                        v_officine_id := NEW.id;
                    ELSE
                        v_officine_id := NULLIF(v_new_data->>'officine_id', '')::uuid;
                    END IF;
                ELSIF TG_OP = 'UPDATE' THEN
                    v_record_id := NEW.id::text;
                    v_old_data := to_jsonb(OLD);
                    v_new_data := to_jsonb(NEW);
                    IF TG_TABLE_NAME = 'officines' THEN
                        v_officine_id := NEW.id;
                    ELSE
                        v_officine_id := NULLIF(v_new_data->>'officine_id', '')::uuid;
                    END IF;
                ELSIF TG_OP = 'DELETE' THEN
                    v_record_id := OLD.id::text;
                    v_old_data := to_jsonb(OLD);
                    IF TG_TABLE_NAME = 'officines' THEN
                        v_officine_id := OLD.id;
                    ELSE
                        v_officine_id := NULLIF(v_old_data->>'officine_id', '')::uuid;
                    END IF;
                END IF;

                INSERT INTO public.audit_logs (
                    officine_id,
                    table_name,
                    record_id,
                    action,
                    user_id,
                    user_email,
                    old_data,
                    new_data,
                    ip_address,
                    user_agent,
                    device_id,
                    server_timestamp
                ) VALUES (
                    v_officine_id,
                    TG_TABLE_NAME,
                    v_record_id,
                    TG_OP,
                    v_user_id,
                    v_user_email,
                    v_old_data,
                    v_new_data,
                    v_ip,
                    v_user_agent,
                    v_device_id,
                    now()
                );

                IF TG_OP = 'DELETE' THEN
                    RETURN OLD;
                ELSE
                    RETURN NEW;
                END IF;
            END;
            $$;
            ALTER TABLE public.audit_logs ADD COLUMN chain_sequence bigint;
            ALTER TABLE public.audit_logs ADD COLUMN empreinte_precedente text;
            ALTER TABLE public.audit_logs ADD COLUMN empreinte_sha256 text;
            CREATE UNIQUE INDEX audit_chain_sequence_unique
                ON public.audit_logs (officine_id, chain_sequence) NULLS NOT DISTINCT
                WHERE chain_sequence IS NOT NULL;

            CREATE FUNCTION public.audit_row_hash(payload jsonb) RETURNS text
            LANGUAGE sql IMMUTABLE STRICT SET search_path = public, pg_temp AS $$
                SELECT encode(pg_catalog.sha256(convert_to((payload - 'empreinte_sha256')::text, 'UTF8')), 'hex');
            $$;

            CREATE FUNCTION public.chain_audit_insert() RETURNS trigger
            LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
            DECLARE precedent public.audit_logs%ROWTYPE;
            BEGIN
                -- Sérialiser les ajouts, y compris ceux de transactions concurrentes.
                PERFORM pg_advisory_xact_lock(764321985);
                SELECT * INTO precedent FROM public.audit_logs
                WHERE officine_id IS NOT DISTINCT FROM NEW.officine_id AND chain_sequence IS NOT NULL
                ORDER BY chain_sequence DESC LIMIT 1;
                NEW.chain_sequence := COALESCE(precedent.chain_sequence, 0) + 1;
                NEW.empreinte_precedente := COALESCE(precedent.empreinte_sha256, repeat('0', 64));
                NEW.empreinte_sha256 := public.audit_row_hash(to_jsonb(NEW));
                RETURN NEW;
            END;
            $$;
            CREATE TRIGGER trg_audit_no_truncate BEFORE TRUNCATE ON public.audit_logs
                FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_tampering();
            CREATE TRIGGER trg_chain_audit_insert BEFORE INSERT ON public.audit_logs
                FOR EACH ROW EXECUTE FUNCTION public.chain_audit_insert();
        SQL);
        // Ne pas recalculer les anciennes lignes : aucune preuve d'antériorité ne serait créée.
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DROP TRIGGER IF EXISTS trg_audit_no_truncate ON public.audit_logs;
            DROP TRIGGER IF EXISTS trg_chain_audit_insert ON public.audit_logs;
            DROP FUNCTION IF EXISTS public.chain_audit_insert();
            DROP FUNCTION IF EXISTS public.audit_row_hash(jsonb);
            DROP INDEX IF EXISTS public.audit_chain_sequence_unique;
            ALTER TABLE public.audit_logs DROP COLUMN empreinte_sha256,
                DROP COLUMN empreinte_precedente, DROP COLUMN chain_sequence;
        SQL);
    }
};

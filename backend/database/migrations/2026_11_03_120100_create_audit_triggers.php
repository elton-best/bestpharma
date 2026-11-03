<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
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
                    ELSIF TG_TABLE_NAME IN ('utilisateurs_officines', 'officine_parametres', 'appareils_autorises') THEN
                        v_officine_id := NEW.officine_id;
                    END IF;
                ELSIF TG_OP = 'UPDATE' THEN
                    v_record_id := NEW.id::text;
                    v_old_data := to_jsonb(OLD);
                    v_new_data := to_jsonb(NEW);
                    IF TG_TABLE_NAME = 'officines' THEN
                        v_officine_id := NEW.id;
                    ELSIF TG_TABLE_NAME IN ('utilisateurs_officines', 'officine_parametres', 'appareils_autorises') THEN
                        v_officine_id := NEW.officine_id;
                    END IF;
                ELSIF TG_OP = 'DELETE' THEN
                    v_record_id := OLD.id::text;
                    v_old_data := to_jsonb(OLD);
                    IF TG_TABLE_NAME = 'officines' THEN
                        v_officine_id := OLD.id;
                    ELSIF TG_TABLE_NAME IN ('utilisateurs_officines', 'officine_parametres', 'appareils_autorises') THEN
                        v_officine_id := OLD.officine_id;
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

            -- Triggers d'audit sur les tables sensibles du Sprint 0
            DROP TRIGGER IF EXISTS trg_audit_officines ON public.officines;
            CREATE TRIGGER trg_audit_officines
            AFTER INSERT OR UPDATE OR DELETE ON public.officines
            FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

            DROP TRIGGER IF EXISTS trg_audit_utilisateurs_officines ON public.utilisateurs_officines;
            CREATE TRIGGER trg_audit_utilisateurs_officines
            AFTER INSERT OR UPDATE OR DELETE ON public.utilisateurs_officines
            FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

            DROP TRIGGER IF EXISTS trg_audit_officine_parametres ON public.officine_parametres;
            CREATE TRIGGER trg_audit_officine_parametres
            AFTER INSERT OR UPDATE OR DELETE ON public.officine_parametres
            FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

            DROP TRIGGER IF EXISTS trg_audit_appareils_autorises ON public.appareils_autorises;
            CREATE TRIGGER trg_audit_appareils_autorises
            AFTER INSERT OR UPDATE OR DELETE ON public.appareils_autorises
            FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
        SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DROP TRIGGER IF EXISTS trg_audit_officines ON public.officines;
            DROP TRIGGER IF EXISTS trg_audit_utilisateurs_officines ON public.utilisateurs_officines;
            DROP TRIGGER IF EXISTS trg_audit_officine_parametres ON public.officine_parametres;
            DROP TRIGGER IF EXISTS trg_audit_appareils_autorises ON public.appareils_autorises;
            DROP FUNCTION IF EXISTS public.fn_audit_trigger();
        SQL);
    }
};

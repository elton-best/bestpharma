<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Table des officines
        Schema::create('officines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nom');
            $table->string('raison_sociale');
            $table->string('numero_licence')->unique();
            $table->date('date_licence')->nullable();
            $table->text('adresse');
            $table->string('ville')->default('Cotonou');
            $table->string('telephone');
            $table->string('email')->nullable();
            $table->string('regime_fiscal')->nullable();
            $table->string('fuseau', 50)->default('Africa/Porto-Novo');
            $table->string('devise', 10)->default('XOF');
            $table->boolean('actif')->default(true);
            $table->boolean('archived')->default(false);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
        });

        // 2. Rattachement utilisateurs - officines
        Schema::create('utilisateurs_officines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role_code', 50)->default('dispensateur');
            $table->boolean('actif')->default(true);
            $table->boolean('archived')->default(false);
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->unique(['officine_id', 'user_id']);
        });

        // 3. Paramètres d'officine (typés et versionnés)
        Schema::create('officine_parametres', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('cle', 100);
            $table->jsonb('valeur');
            $table->string('type_donnee', 30)->default('string');
            $table->text('description')->nullable();
            $table->integer('version')->default(1);
            $table->boolean('archived')->default(false);
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->unique(['officine_id', 'cle']);
        });

        // 4. Appareils autorisés et bornes
        Schema::create('appareils_autorises', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('nom_appareil', 100);
            $table->string('identifiant_unique', 255);
            $table->string('type_appareil', 50)->default('pc_bureau');
            $table->boolean('est_borne_pointage')->default(false);
            $table->boolean('actif')->default(true);
            $table->timestamp('derniere_activite')->nullable();
            $table->uuid('enregistre_par')->nullable();
            $table->boolean('archived')->default(false);
            $table->timestamps();

            $table->unique(['officine_id', 'identifiant_unique']);
        });

        // 5. Journal d'audit inaltérable (append-only)
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('officine_id')->nullable()->index();
            $table->string('table_name', 100);
            $table->string('record_id', 255);
            $table->string('action', 20); // INSERT, UPDATE, DELETE
            $table->uuid('user_id')->nullable()->index();
            $table->string('user_email', 255)->nullable();
            $table->jsonb('old_data')->nullable();
            $table->jsonb('new_data')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('device_id', 100)->nullable();
            $table->timestamp('server_timestamp')->useCurrent();
        });

        // 6. Triggers PostgreSQL d'inaltérabilité sur audit_logs
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION public.prevent_audit_tampering()
            RETURNS TRIGGER
            LANGUAGE plpgsql
            AS $$
            BEGIN
                RAISE EXCEPTION 'Action interdite : le journal d''audit est strictement inaltérable (append-only).';
            END;
            $$;

            DROP TRIGGER IF EXISTS trg_audit_logs_tamper_defense ON public.audit_logs;
            CREATE TRIGGER trg_audit_logs_tamper_defense
            BEFORE UPDATE OR DELETE ON public.audit_logs
            FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_tampering();
        SQL);

        // 7. Fonction SQL user_officines() pour le cloisonnement RLS
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION public.user_officines()
            RETURNS SETOF UUID
            LANGUAGE sql
            STABLE
            SECURITY DEFINER
            SET search_path = public
            AS $$
                SELECT officine_id 
                FROM public.utilisateurs_officines 
                WHERE user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid 
                  AND actif = TRUE 
                  AND archived = FALSE;
            $$;
        SQL);

        // 8. Activation et politiques RLS sur les tables métier
        DB::unprepared(<<<'SQL'
            -- Active RLS
            ALTER TABLE public.officines ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.utilisateurs_officines ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.officine_parametres ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.appareils_autorises ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

            -- Politiques RLS
            DROP POLICY IF EXISTS p_officines_isolation ON public.officines;
            CREATE POLICY p_officines_isolation ON public.officines
                FOR ALL
                USING (
                    NULLIF(current_setting('app.current_user_id', true), '') IS NULL
                    OR id IN (SELECT public.user_officines())
                );

            DROP POLICY IF EXISTS p_utilisateurs_officines_isolation ON public.utilisateurs_officines;
            CREATE POLICY p_utilisateurs_officines_isolation ON public.utilisateurs_officines
                FOR ALL
                USING (
                    NULLIF(current_setting('app.current_user_id', true), '') IS NULL
                    OR officine_id IN (SELECT public.user_officines())
                );

            DROP POLICY IF EXISTS p_officine_parametres_isolation ON public.officine_parametres;
            CREATE POLICY p_officine_parametres_isolation ON public.officine_parametres
                FOR ALL
                USING (
                    NULLIF(current_setting('app.current_user_id', true), '') IS NULL
                    OR officine_id IN (SELECT public.user_officines())
                );

            DROP POLICY IF EXISTS p_appareils_autorises_isolation ON public.appareils_autorises;
            CREATE POLICY p_appareils_autorises_isolation ON public.appareils_autorises
                FOR ALL
                USING (
                    NULLIF(current_setting('app.current_user_id', true), '') IS NULL
                    OR officine_id IN (SELECT public.user_officines())
                );

            DROP POLICY IF EXISTS p_audit_logs_isolation ON public.audit_logs;
            CREATE POLICY p_audit_logs_isolation ON public.audit_logs
                FOR ALL
                USING (
                    NULLIF(current_setting('app.current_user_id', true), '') IS NULL
                    OR officine_id IS NULL
                    OR officine_id IN (SELECT public.user_officines())
                );
        SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DROP TRIGGER IF EXISTS trg_audit_logs_tamper_defense ON public.audit_logs;
            DROP FUNCTION IF EXISTS public.prevent_audit_tampering();
            DROP FUNCTION IF EXISTS public.user_officines();
        SQL);

        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('appareils_autorises');
        Schema::dropIfExists('officine_parametres');
        Schema::dropIfExists('utilisateurs_officines');
        Schema::dropIfExists('officines');
    }
};

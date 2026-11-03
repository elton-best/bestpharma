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
        // 1. Documents et procédures qualité (avec versionnement et inaltérabilité)
        Schema::create('documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('titre');
            $table->string('categorie')->default('procedure');
            $table->text('contenu')->nullable();
            $table->integer('version')->default(1);
            $table->string('statut', 30)->default('brouillon'); // brouillon, a_valider, valide
            $table->boolean('modele')->default(false);
            $table->timestamp('valide_le')->nullable();
            $table->uuid('valide_par')->nullable();
            $table->boolean('archived')->default(false);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
        });

        // 2. Échéances réglementaires
        Schema::create('echeances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('titre');
            $table->string('categorie')->default('reglementaire');
            $table->date('date_echeance');
            $table->boolean('fait')->default(false);
            $table->boolean('archived')->default(false);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
        });

        // 3. Fiches personnel employés
        Schema::create('employes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('nom_complet');
            $table->string('poste', 50)->default('dispensateur');
            $table->string('telephone', 50)->nullable();
            $table->date('date_embauche')->nullable();
            $table->boolean('actif')->default(true);
            $table->boolean('archived')->default(false);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
        });

        // 4. Pointages du personnel
        Schema::create('pointages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignUuid('employe_id')->constrained('employes')->cascadeOnDelete();
            $table->string('type', 20); // arrivee, depart
            $table->timestamp('horodatage')->useCurrent();
            $table->timestamps();
        });

        // 5. Non-conformités et fiches de suivi
        Schema::create('non_conformites', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('titre');
            $table->text('description')->nullable();
            $table->string('gravite', 30)->default('mineure'); // mineure, majeure, critique
            $table->string('statut', 30)->default('ouverte'); // ouverte, en_cours, cloturee
            $table->text('action_corrective')->nullable();
            $table->boolean('archived')->default(false);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
        });

        // Activation de RLS et triggers d'audit sur ces tables
        $tables = ['documents', 'echeances', 'employes', 'pointages', 'non_conformites'];
        foreach ($tables as $t) {
            DB::unprepared("ALTER TABLE {$t} ENABLE ROW LEVEL SECURITY;");
            DB::unprepared("DROP POLICY IF EXISTS tenant_isolation_{$t} ON {$t};");
            DB::unprepared("CREATE POLICY tenant_isolation_{$t} ON {$t}
                FOR ALL
                USING (
                    current_setting('app.is_admin', true) = 'true'
                    OR officine_id IN (SELECT user_officines())
                );");

            DB::unprepared("DROP TRIGGER IF EXISTS trg_audit_{$t} ON {$t};");
            DB::unprepared("CREATE TRIGGER trg_audit_{$t}
                AFTER INSERT OR UPDATE OR DELETE ON {$t}
                FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = ['non_conformites', 'pointages', 'employes', 'echeances', 'documents'];
        foreach ($tables as $t) {
            DB::unprepared("DROP TRIGGER IF EXISTS trg_audit_{$t} ON {$t};");
            DB::unprepared("DROP POLICY IF EXISTS tenant_isolation_{$t} ON {$t};");
            Schema::dropIfExists($t);
        }
    }
};

<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
    public function up(): void {
        Schema::create('alertes_peremption', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('officine_id')->constrained('officines')->restrictOnDelete();
            $t->foreignUuid('stock_lot_id')->constrained('stocks_lots')->restrictOnDelete();
            $t->foreignUuid('user_id')->constrained('users')->restrictOnDelete();
            $t->date('date_peremption'); $t->integer('seuil_jours'); $t->string('destinataire');
            $t->string('statut')->default('en_attente'); $t->integer('tentatives')->default(0);
            $t->timestampTz('envoye_le')->nullable(); $t->timestamps();
            $t->unique(['stock_lot_id','date_peremption','seuil_jours','user_id'], 'alerte_peremption_unique');
        });
        DB::unprepared(<<<'SQL'
            ALTER TABLE public.alertes_peremption ENABLE ROW LEVEL SECURITY;
            CREATE POLICY p_alertes_peremption ON public.alertes_peremption FOR ALL
                USING (NULLIF(current_setting('app.current_user_id', true), '') IS NULL OR officine_id IN (SELECT public.user_officines()));
            CREATE TRIGGER trg_audit_alertes_peremption AFTER INSERT OR UPDATE ON public.alertes_peremption
                FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();
            CREATE TRIGGER trg_alertes_no_delete BEFORE DELETE ON public.alertes_peremption
                FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_tampering();
            CREATE TRIGGER trg_alertes_no_truncate BEFORE TRUNCATE ON public.alertes_peremption
                FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_tampering();
        SQL);
    }
    public function down(): void { Schema::dropIfExists('alertes_peremption'); }
};

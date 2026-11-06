<?php

namespace Tests\Feature;

use App\Services\VerificationAuditService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class VerificationAuditTest extends TestCase
{
    use DatabaseTransactions;

    private function ajouter(string $officine): int
    {
        return DB::table('audit_logs')->insertGetId([
            'officine_id' => $officine, 'table_name' => 'documents',
            'record_id' => (string) Str::uuid(), 'action' => 'INSERT',
            'new_data' => json_encode(['titre' => 'Document de recette, non exploitable en officine']),
            'server_timestamp' => now(),
        ]);
    }

    public function test_journal_vide_non_atteste(): void
    {
        $bilan = (new VerificationAuditService)->verifier((string) Str::uuid());
        $this->assertSame('vide', $bilan['status']);
        $this->assertFalse($bilan['integre']);
    }

    public function test_chaine_reelle_et_isolation_entre_officines(): void
    {
        $a = (string) Str::uuid();
        $b = (string) Str::uuid();
        $this->ajouter($a);
        $this->ajouter($b);
        $this->ajouter($a);
        $bilan = (new VerificationAuditService)->verifier($a);
        $this->assertSame('conforme', $bilan['status']);
        $this->assertSame(2, $bilan['total_entrees_verifiees']);
        $this->assertTrue($bilan['integre']);
        $this->assertSame([1, 2], DB::table('audit_logs')->where('officine_id', $a)->orderBy('chain_sequence')->pluck('chain_sequence')->map(fn ($n) => (int) $n)->all());
    }

    public function test_alteration_detectee_a_la_premiere_entree(): void
    {
        $officine = (string) Str::uuid();
        $id = $this->ajouter($officine);
        $this->ajouter($officine);
        // Simulation d'une compromission administrateur, jamais une API applicative.
        DB::statement('ALTER TABLE public.audit_logs DISABLE TRIGGER trg_audit_logs_tamper_defense');
        try {
            DB::table('audit_logs')->where('id', $id)->update(['action' => 'DELETE']);
        } finally {
            DB::statement('ALTER TABLE public.audit_logs ENABLE TRIGGER trg_audit_logs_tamper_defense');
        }
        $bilan = (new VerificationAuditService)->verifier($officine);
        $this->assertSame('rupture', $bilan['status']);
        $this->assertSame($id, (int) $bilan['premiere_rupture_id']);
        $this->assertFalse($bilan['integre']);
    }

    public function test_historique_non_chaine_jamais_declare_conforme(): void
    {
        $officine = (string) Str::uuid();
        DB::statement('ALTER TABLE public.audit_logs DISABLE TRIGGER trg_chain_audit_insert');
        try {
            $this->ajouter($officine);
        } finally {
            DB::statement('ALTER TABLE public.audit_logs ENABLE TRIGGER trg_chain_audit_insert');
        }
        $this->ajouter($officine);
        $bilan = (new VerificationAuditService)->verifier($officine);
        $this->assertSame('partiel', $bilan['status']);
        $this->assertSame(1, $bilan['entrees_historiques_non_chainees']);
        $this->assertFalse($bilan['integre']);
    }
}

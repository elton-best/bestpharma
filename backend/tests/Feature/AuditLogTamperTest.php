<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Officine;
use App\Models\OfficineParametre;
use App\Models\User;
use App\Models\UtilisateurOfficine;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AuditLogTamperTest extends TestCase
{
    use DatabaseTransactions;

    public function test_audit_logs_cannot_be_updated_or_deleted(): void
    {
        $officine = Officine::create([
            'nom' => 'Pharmacie Audit',
            'raison_sociale' => 'Pharmacie Audit SARL',
            'numero_licence' => 'LIC-AUDIT-'.uniqid(),
            'adresse' => 'Cotonou',
            'telephone' => '+229 97 44 44 44',
        ]);

        $log = AuditLog::create([
            'officine_id' => $officine->id,
            'table_name' => 'test_table',
            'record_id' => '123',
            'action' => 'INSERT',
            'user_email' => 'admin@test.bj',
            'new_data' => ['sample' => 'data'],
        ]);

        $this->assertNotNull($log->id);

        // Tentative d'UPDATE -> Doit échouer avec l'exception levée par le trigger
        $this->expectException(QueryException::class);
        $this->expectExceptionMessage('Action interdite : le journal d\'audit est strictement inaltérable');

        DB::statement("UPDATE public.audit_logs SET action = 'MODIFIED' WHERE id = ?", [$log->id]);
    }

    public function test_modifying_parameter_triggers_automatic_audit_log(): void
    {
        $user = User::factory()->create();
        $officine = Officine::create([
            'nom' => 'Pharmacie Param',
            'raison_sociale' => 'Pharmacie Param SARL',
            'numero_licence' => 'LIC-PARAM-'.uniqid(),
            'adresse' => 'Cotonou',
            'telephone' => '+229 97 55 55 55',
            'created_by' => $user->id,
        ]);

        UtilisateurOfficine::create([
            'officine_id' => $officine->id,
            'user_id' => $user->id,
            'role_code' => 'promoteur',
            'actif' => true,
        ]);

        $param = OfficineParametre::create([
            'officine_id' => $officine->id,
            'cle' => 'delai_inactivite_minutes',
            'valeur' => ['valeur' => 15],
            'type_donnee' => 'number',
            'created_by' => $user->id,
        ]);

        // Mise à jour via l'API
        $response = $this->actingAs($user)
            ->withHeader('X-Officine-Id', $officine->id)
            ->putJson("/api/officines/{$officine->id}/parametres/delai_inactivite_minutes", [
                'valeur' => 20,
            ]);

        $response->assertOk();

        // Vérification de la présence du log d'audit généré automatiquement par le trigger
        $auditEntry = AuditLog::where('officine_id', $officine->id)
            ->where('table_name', 'officine_parametres')
            ->where('record_id', $param->id)
            ->where('action', 'UPDATE')
            ->latest('id')
            ->first();

        $this->assertNotNull($auditEntry);
        $this->assertEquals(20, $auditEntry->new_data['valeur']['valeur']);
    }
}

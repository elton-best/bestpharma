<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Officine;
use App\Models\OfficineParametre;
use App\Models\User;
use App\Models\UtilisateurOfficine;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class SyncQueueTest extends TestCase
{
    use DatabaseTransactions;

    public function test_offline_operations_are_processed_with_local_and_server_timestamps(): void
    {
        $user = User::factory()->create();
        $officine = Officine::create([
            'nom' => 'Pharmacie Offline',
            'raison_sociale' => 'Pharmacie Offline SARL',
            'numero_licence' => 'LIC-OFF-'.uniqid(),
            'adresse' => 'Cotonou',
            'telephone' => '+229 97 66 66 66',
            'created_by' => $user->id,
        ]);

        UtilisateurOfficine::create([
            'officine_id' => $officine->id,
            'user_id' => $user->id,
            'role_code' => 'promoteur',
            'actif' => true,
        ]);

        OfficineParametre::create([
            'officine_id' => $officine->id,
            'cle' => 'tolerance_pointage_minutes',
            'valeur' => ['valeur' => 5],
            'type_donnee' => 'number',
            'created_by' => $user->id,
        ]);

        $opId = (string) Str::uuid();
        $heureLocale = '2026-11-03T11:00:00+01:00';

        // Envoi de la file d'opérations hors-ligne
        $response = $this->actingAs($user)
            ->withHeader('X-Officine-Id', $officine->id)
            ->postJson('/api/sync/push', [
                'operations' => [
                    [
                        'operation_id' => $opId,
                        'officine_id' => $officine->id,
                        'entity' => 'officine_parametres',
                        'action' => 'UPDATE',
                        'payload' => [
                            'cle' => 'tolerance_pointage_minutes',
                            'valeur' => ['valeur' => 12],
                        ],
                        'heure_locale_saisie' => $heureLocale,
                    ],
                ],
            ]);

        $response->assertOk();
        $response->assertJson([
            'synced_count' => 1,
        ]);

        // Vérification de la conservation de l'heure locale et de l'horodatage serveur dans l'audit
        $auditLog = AuditLog::where('record_id', $opId)->first();
        $this->assertNotNull($auditLog);
        $this->assertEquals($heureLocale, $auditLog->old_data['heure_locale_saisie']);
        $this->assertNotNull($auditLog->server_timestamp);

        // Rejeu de la même opération (test d'idempotence et non-doublon)
        $replayResponse = $this->actingAs($user)
            ->withHeader('X-Officine-Id', $officine->id)
            ->postJson('/api/sync/push', [
                'operations' => [
                    [
                        'operation_id' => $opId,
                        'officine_id' => $officine->id,
                        'entity' => 'officine_parametres',
                        'action' => 'UPDATE',
                        'payload' => [
                            'cle' => 'tolerance_pointage_minutes',
                            'valeur' => ['valeur' => 12],
                        ],
                        'heure_locale_saisie' => $heureLocale,
                    ],
                ],
            ]);

        $replayResponse->assertOk();
        $this->assertEquals('already_processed', $replayResponse->json('operations.0.status'));
        $this->assertEquals(0, $replayResponse->json('synced_count'));
    }
}

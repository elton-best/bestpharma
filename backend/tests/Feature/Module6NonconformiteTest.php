<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Module6NonconformiteTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $pharmacist;
    private Officine $office;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::create(['name' => 'Admin Qualite M6', 'email' => 'admin-m6@example.test', 'password' => 'Fictional12345']);
        $this->pharmacist = User::create(['name' => 'Dr Pharmacien', 'email' => 'pharmacien@example.test', 'password' => 'Fictional12345']);
        $this->office = Officine::create(['name' => 'Pharmacie Recette M6', 'slug' => 'pharmacie-recette-m6', 'status' => 'active']);

        DB::table('officine_user')->insert([
            ['user_id' => $this->admin->id, 'officine_id' => $this->office->id, 'is_admin' => true, 'is_active' => true, 'permissions' => '[]'],
            ['user_id' => $this->pharmacist->id, 'officine_id' => $this->office->id, 'is_admin' => false, 'is_active' => true, 'permissions' => '[]'],
        ]);
        DB::table('officine_modules')->insert(['officine_id' => $this->office->id, 'module' => 'qualite', 'is_active' => true]);

        Sanctum::actingAs($this->admin);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    public function test_overview_indicators_and_empty_rate(): void
    {
        $res = $this->getJson('/api/v1/qualite/nonconformites/overview');
        $res->assertOk();
        $res->assertJsonStructure([
            'status',
            'indicators' => [
                'complaints_total',
                'complaints_pending',
                'complaints_overdue_72h',
                'nc_total',
                'nc_open',
                'nc_closed',
                'nc_overdue_30d',
                'by_severity',
                'by_status',
                'resolution_rate',
            ],
        ]);
        // Règle CDC 6 : dénominateur nul donne "Non disponible" et non 0%
        $this->assertEquals('Non disponible', $res->json('indicators.resolution_rate'));
    }

    public function test_complaint_registration_and_response_lifecycle(): void
    {
        // Enregistrer une réclamation
        $createRes = $this->postJson('/api/v1/qualite/nonconformites/complaints', [
            'channel' => 'comptoir',
            'complainant_type' => 'patient',
            'complainant_name' => 'Jean Dupont',
            'complainant_contact' => '+229 97 00 00 01',
            'category' => 'produit_defectueux',
            'title' => 'Flacon de sirop avec bouchon endommagé',
            'description' => 'Le patient a constaté une fuite du flacon de sirop lors de l’ouverture.',
            'desired_solution' => 'Échange immédiat du produit',
            'received_date' => now()->toDateString(),
        ]);
        $createRes->assertCreated();
        $complaintId = $createRes->json('data.id');
        $this->assertStringStartsWith('REC-', $createRes->json('data.reference'));

        // Tentative de clôture sans réponse -> échec (CDC 3.5)
        $closeFail = $this->postJson("/api/v1/qualite/nonconformites/complaints/{$complaintId}/close");
        $closeFail->assertStatus(422);

        // Consigner la réponse apportée
        $respRes = $this->postJson("/api/v1/qualite/nonconformites/complaints/{$complaintId}/responses", [
            'response_channel' => 'oral_comptoir',
            'response_content' => 'Flacon échangé immédiatement au comptoir avec vérification du lot.',
            'decision_type' => 'favorable',
        ]);
        $respRes->assertCreated();

        // Clôture autorisée
        $closeSuccess = $this->postJson("/api/v1/qualite/nonconformites/complaints/{$complaintId}/close");
        $closeSuccess->assertOk();
        $this->assertEquals('closed', $closeSuccess->json('data.status'));
    }

    public function test_convert_complaint_to_nonconformity_bridge(): void
    {
        $createRes = $this->postJson('/api/v1/qualite/nonconformites/complaints', [
            'channel' => 'telephone',
            'complainant_type' => 'patient',
            'is_anonymous' => true,
            'category' => 'dispensation',
            'title' => 'Erreur de dosage alléguée',
            'description' => 'Le patient signale un comprimé de 500mg au lieu de 250mg.',
            'received_date' => now()->toDateString(),
        ]);
        $complaintId = $createRes->json('data.id');

        // Conversion directe en non-conformité (CDC 7 & 3.3)
        $ncRes = $this->postJson("/api/v1/qualite/nonconformites/complaints/{$complaintId}/create-nc", [
            'activity_domain' => 'dispensation',
            'severity' => 'majeure',
            'immediate_actions' => 'Retrait immédiat du pilulier pour analyse contradictoire.',
        ]);
        $ncRes->assertCreated();
        $this->assertStringStartsWith('NC-', $ncRes->json('data.reference'));
        $this->assertEquals($complaintId, $ncRes->json('data.complaint_id'));
    }

    public function test_nc_root_cause_analysis_capa_bridge_and_strict_closure(): void
    {
        // 1. Déclarer la non-conformité
        $createRes = $this->postJson('/api/v1/qualite/nonconformites/nc', [
            'source_type' => 'internal_detection',
            'activity_domain' => 'chaine_du_froid',
            'title' => 'Excursion de température enceinte frigo #2',
            'description' => 'Relevé à 9.5°C pendant 3h suite à coupure d’onduleur.',
            'detection_date' => now()->toDateString(),
            'detected_by' => $this->pharmacist->id,
            'nature' => 'non_conformite',
            'severity' => 'critique',
            'immediate_actions' => 'Transfert immédiat des vaccins vers enceinte de secours #1.',
        ]);
        $createRes->assertCreated();
        $ncId = $createRes->json('data.id');

        // 2. Analyse des causes racines (5 Pourquoi - CDC 3.2)
        $causeRes = $this->postJson("/api/v1/qualite/nonconformites/nc/{$ncId}/root-cause", [
            'method' => '5_why',
            'why_1' => 'La température a dépassé 8°C',
            'why_2' => 'L’onduleur s’est coupé sans relais automatique',
            'why_3' => 'La batterie de l’onduleur était en fin de vie',
            'why_4' => 'La maintenance préventive n’avait pas été planifiée',
            'why_5' => 'Absence d’échéancier d’entretien sur ce matériel',
            'main_cause' => 'Défaut de plan de maintenance préventive des équipements de secours.',
        ]);
        $causeRes->assertOk();

        // 3. Passerelle 1-clic : Création d’une action CAPA dans Module 04
        $capaRes = $this->postJson("/api/v1/qualite/nonconformites/nc/{$ncId}/actions", [
            'title' => 'Souscrire contrat de maintenance préventive onduleurs',
            'description' => 'Remplacer le parc de batteries et contractualiser la révision trimestrielle.',
            'owner_id' => $this->admin->id,
            'due_date' => now()->addDays(10)->toDateString(),
            'priority' => 'high',
            'effectiveness_criteria' => 'Test de coupure secteur mensuel réussi avec autonomie > 4h.',
        ]);
        $capaRes->assertCreated();
        $this->assertNotNull($capaRes->json('data.action.id'));

        // 4. Tentative de clôture sans revue d’efficacité probante -> ÉCHEC strict (CDC 3.5 & 7)
        $closeFail = $this->postJson("/api/v1/qualite/nonconformites/nc/{$ncId}/close");
        $closeFail->assertStatus(422);

        // 5. Revue d'efficacité probante (CDC 3.5)
        $reviewRes = $this->postJson("/api/v1/qualite/nonconformites/nc/{$ncId}/effectiveness", [
            'criteria_evaluated' => 'Vérification du test de déconnexion secteur du 15/11.',
            'is_effective' => true,
            'observations' => 'Nouvelles batteries installées, autonomie mesurée à 5h20 sans variation thermique.',
            'decision' => 'approve_closure',
        ]);
        $reviewRes->assertCreated();

        // 6. Clôture formelle
        $closeSuccess = $this->postJson("/api/v1/qualite/nonconformites/nc/{$ncId}/close");
        $closeSuccess->assertOk();
        $this->assertEquals('closed', $closeSuccess->json('data.status'));
    }
}

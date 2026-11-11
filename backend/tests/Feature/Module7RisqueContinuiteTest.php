<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Module7RisqueContinuiteTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $riskManager;
    private Officine $office;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::create(['name' => 'Admin Qualite M7', 'email' => 'admin-m7@example.test', 'password' => 'Fictional12345']);
        $this->riskManager = User::create(['name' => 'Responsable Risques', 'email' => 'risques@example.test', 'password' => 'Fictional12345']);
        $this->office = Officine::create(['name' => 'Pharmacie Recette M7', 'slug' => 'pharmacie-recette-m7', 'status' => 'active']);

        DB::table('officine_user')->insert([
            ['user_id' => $this->admin->id, 'officine_id' => $this->office->id, 'is_admin' => true, 'is_active' => true, 'permissions' => '[]'],
            ['user_id' => $this->riskManager->id, 'officine_id' => $this->office->id, 'is_admin' => false, 'is_active' => true, 'permissions' => '[]'],
        ]);
        DB::table('officine_modules')->insert(['officine_id' => $this->office->id, 'module' => 'qualite', 'is_active' => true]);

        Sanctum::actingAs($this->admin);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    public function test_overview_indicators(): void
    {
        $res = $this->getJson('/api/v1/qualite/risques/overview');
        $res->assertOk();
        $res->assertJsonStructure([
            'status',
            'indicators' => [
                'total_risks',
                'total_opportunities',
                'by_criticality' => ['critique', 'eleve', 'modere', 'faible', 'non_evalue'],
                'pca_active_scenarios',
                'pca_exercises_conducted',
            ],
        ]);
        $this->assertEquals(0, $res->json('indicators.total_risks'));
    }

    public function test_risk_creation_and_matrix_scoring_2_x_3_equals_6(): void
    {
        // Règle CDC 7 : vérifier expressément le calcul 2 x 3 = 6 (criticité modérée)
        $res = $this->postJson('/api/v1/qualite/risques', [
            'type' => 'risk',
            'process_scope' => 'Locaux & Matériel',
            'title' => 'Panne d’onduleur sur enceinte frigorifique',
            'description' => 'Risque de rupture de la chaîne du froid en cas de micro-coupure secteur.',
            'owner_id' => $this->riskManager->id,
            'initial_probability' => 2,
            'initial_impact' => 3,
            'rationale' => 'Deux micro-coupures observées ce trimestre sans dommage produit.',
        ]);
        $res->assertCreated();
        $this->assertStringStartsWith('RSK-', $res->json('data.reference'));
        $this->assertEquals(6, $res->json('data.initial_assessment.score'));
        $this->assertEquals('modere', $res->json('data.initial_assessment.criticality_level'));
    }

    public function test_residual_assessment_separation_and_status_transition(): void
    {
        $createRes = $this->postJson('/api/v1/qualite/risques', [
            'type' => 'risk',
            'process_scope' => 'Dispensation',
            'title' => 'Confusion de dosage pour spécialité pédiatrique',
            'description' => 'Risque de délivrance de 500mg au lieu de 250mg.',
            'owner_id' => $this->riskManager->id,
            'initial_probability' => 3,
            'initial_impact' => 4, // Score initial : 12 -> 'eleve'
        ]);
        $createRes->assertCreated();
        $riskId = $createRes->json('data.id');

        // Évaluation résiduelle après mise en place de bacs séparés et double contrôle
        // CDC 3.4 & 7 : Séparation stricte des évaluations initiale et résiduelle
        $assessRes = $this->postJson("/api/v1/qualite/risques/{$riskId}/assess", [
            'assessment_type' => 'residual',
            'probability' => 1,
            'impact' => 2, // Score résiduel : 2 -> 'faible'
            'rationale' => 'Bacs de couleur et étiquetage fluo mis en place.',
        ]);
        $assessRes->assertOk();
        $this->assertEquals(2, $assessRes->json('data.score'));
        $this->assertEquals('faible', $assessRes->json('data.criticality_level'));

        // Vérification de la consultation détaillée : initiale ET résiduelle distinctes
        $showRes = $this->getJson("/api/v1/qualite/risques/{$riskId}");
        $showRes->assertOk();
        $this->assertEquals(12, $showRes->json('data.initial_assessment.score'));
        $this->assertEquals(2, $showRes->json('data.residual_assessment.score'));
        $this->assertEquals('mitigated', $showRes->json('data.status'));
    }

    public function test_capa_action_bridge_from_risk(): void
    {
        $createRes = $this->postJson('/api/v1/qualite/risques', [
            'type' => 'risk',
            'process_scope' => 'Approvisionnement',
            'title' => 'Rupture d’insuline d’urgence',
            'description' => 'Délai grossiste allongé le weekend.',
            'owner_id' => $this->admin->id,
        ]);
        $riskId = $createRes->json('data.id');

        // Création action CAPA Module 04
        $capaRes = $this->postJson("/api/v1/qualite/risques/{$riskId}/actions", [
            'title' => 'Sécuriser stock tampon de sécurité insuline',
            'description' => 'Ajuster le stock mini de 5 à 15 unités avant chaque vendredi.',
            'owner_id' => $this->admin->id,
            'due_date' => now()->addDays(7)->toDateString(),
            'mitigation_strategy' => 'reduce',
            'effectiveness_criteria' => 'Zéro rupture constatée sur les ordonnances du samedi.',
        ]);
        $capaRes->assertCreated();
        $this->assertNotNull($capaRes->json('data.action.id'));
    }

    public function test_pca_scenario_and_emergency_exercise(): void
    {
        // 1. Créer un scénario PCA (CDC 3.5)
        $scenarioRes = $this->postJson('/api/v1/qualite/risques/pca/scenarios', [
            'title' => 'Plan de secours : Coupure électrique prolongée',
            'threat_type' => 'coupure_energie',
            'trigger_events' => 'Coupure secteur supérieure à 30 minutes sans rétablissement.',
            'immediate_actions' => 'Démarrage manuel du groupe électrogène et vérification niveau gasoil.',
            'alternative_operations' => 'Alimentation exclusive des 2 frigos de garde et de la caisse 1.',
            'rto_hours' => 2,
            'coordinator_id' => $this->admin->id,
            'crisis_contacts' => [
                ['role' => 'Technicien Groupe Électrogène', 'name' => 'M. Dossou', 'phone' => '+229 97 11 22 33'],
                ['role' => 'Pharmacien d’astreinte', 'name' => 'Dr Mensah', 'phone' => '+229 95 44 55 66'],
            ],
        ]);
        $scenarioRes->assertCreated();
        $scenarioId = $scenarioRes->json('data.id');
        $this->assertStringStartsWith('PCA-', $scenarioRes->json('data.reference'));

        // 2. Enregistrer un exercice de test / simulation (CDC 3.5 & 7)
        $exerciseRes = $this->postJson("/api/v1/qualite/risques/pca/scenarios/{$scenarioId}/exercises", [
            'title' => 'Test annuel de basculement groupe électrogène',
            'test_type' => 'simulation',
            'exercise_date' => now()->toDateString(),
            'measured_recovery_minutes' => 12,
            'is_successful' => true,
            'findings' => 'Basculement automatique réussi en 12 minutes, températures frigo stables à 4.2°C.',
            'improvement_points' => 'Prévoir bidon de réserve gasoil supplémentaire.',
        ]);
        $exerciseRes->assertCreated();
        $this->assertEquals(12, $exerciseRes->json('data.measured_recovery_minutes'));
        $this->assertTrue($exerciseRes->json('data.is_successful'));
    }
}

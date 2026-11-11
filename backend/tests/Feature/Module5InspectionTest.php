<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Module5InspectionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $inspector;
    private Officine $office;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::create(['name' => 'Admin Qualite', 'email' => 'admin-qualite@example.test', 'password' => 'Fictional12345']);
        $this->inspector = User::create(['name' => 'Dr Auditeur BPD', 'email' => 'auditeur@example.test', 'password' => 'Fictional12345']);
        $this->office = Officine::create(['name' => 'Pharmacie Recette M5', 'slug' => 'pharmacie-recette-m5', 'status' => 'active']);

        DB::table('officine_user')->insert([
            ['user_id' => $this->admin->id, 'officine_id' => $this->office->id, 'is_admin' => true, 'is_active' => true, 'permissions' => '[]'],
            ['user_id' => $this->inspector->id, 'officine_id' => $this->office->id, 'is_admin' => false, 'is_active' => true, 'permissions' => '[]'],
        ]);
        DB::table('officine_modules')->insert(['officine_id' => $this->office->id, 'module' => 'qualite', 'is_active' => true]);

        Sanctum::actingAs($this->admin);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    public function test_overview_returns_bpd_indicators(): void
    {
        $res = $this->getJson('/api/v1/qualite/inspections/overview');
        $res->assertOk();
        $res->assertJsonStructure([
            'status',
            'indicators' => ['total', 'overdue', 'coverage_rate', 'coverage_label', 'by_status'],
            'core_processes',
            'covered_processes',
        ]);
        $this->assertEquals(0, $res->json('indicators.total'));
    }

    public function test_program_creation(): void
    {
        $res = $this->postJson('/api/v1/qualite/inspections/programs', [
            'title' => 'Programme BPD 2026-2027',
            'year_start' => 2026,
            'year_end' => 2027,
            'objective' => 'Couverture intégrale des 5 processus fondamentaux BPD.',
        ]);
        $res->assertCreated();
        $res->assertJsonPath('data.title', 'Programme BPD 2026-2027');

        $list = $this->getJson('/api/v1/qualite/inspections/programs');
        $list->assertOk();
        $this->assertCount(1, $list->json('data'));
    }

    public function test_inspection_scheduling_enforces_independence_rule(): void
    {
        // 1. Échec si conflit_check_passed est faux
        $resFailed = $this->postJson('/api/v1/qualite/inspections', [
            'title' => 'Audit Chaîne du froid',
            'process_scope' => 'Locaux & Chaîne du Froid',
            'objective' => 'Vérification de la chaîne du froid',
            'planned_date' => now()->addDays(7)->toDateString(),
            'lead_inspector_id' => $this->inspector->id,
            'inspectors' => [
                [
                    'user_id' => $this->inspector->id,
                    'role' => 'lead',
                    'regular_service' => 'Locaux & Froid',
                    'conflict_check_passed' => false,
                ]
            ],
        ]);
        $resFailed->assertStatus(422);

        // 2. Succès si indépendance attestée
        $resSuccess = $this->postJson('/api/v1/qualite/inspections', [
            'title' => 'Audit Chaîne du froid',
            'process_scope' => 'Locaux & Chaîne du Froid',
            'objective' => 'Vérification de la chaîne du froid',
            'planned_date' => now()->addDays(7)->toDateString(),
            'lead_inspector_id' => $this->inspector->id,
            'inspectors' => [
                [
                    'user_id' => $this->inspector->id,
                    'role' => 'lead',
                    'regular_service' => 'Qualité & Réglementaire',
                    'conflict_check_passed' => true,
                ]
            ],
        ]);
        $resSuccess->assertCreated();
        $inspectionId = $resSuccess->json('data.id');
        $this->assertNotNull($inspectionId);

        // Vérification que les items BPD ont été générés
        $this->assertGreaterThan(0, count($resSuccess->json('data.items')));
    }

    public function test_complete_inspection_lifecycle_and_sha256_sealing(): void
    {
        // Créer l'inspection
        $createRes = $this->postJson('/api/v1/qualite/inspections', [
            'title' => 'Audit Dispensation Stupéfiants',
            'process_scope' => 'Dispensation & Stupéfiants',
            'objective' => 'Contrôle registre et ordonnances',
            'planned_date' => now()->toDateString(),
            'lead_inspector_id' => $this->inspector->id,
            'inspectors' => [
                [
                    'user_id' => $this->inspector->id,
                    'role' => 'lead',
                    'regular_service' => 'Qualité',
                    'conflict_check_passed' => true,
                ]
            ],
        ]);
        $inspectionId = $createRes->json('data.id');
        $items = $createRes->json('data.items');
        $this->assertNotEmpty($items);
        $firstItemId = $items[0]['id'];

        // Enregistrer les évaluations terrain
        $evalRes = $this->postJson("/api/v1/qualite/inspections/{$inspectionId}/responses", [
            'responses' => [
                [
                    'item_id' => $firstItemId,
                    'status' => 'non_conforme',
                    'observed_facts' => 'Le registre papier n’était pas émargé pour la dernière délivrance.',
                    'evidence_notes' => 'Registre p. 44 ordonnance #8872',
                    'finding_type' => 'non_conformity',
                ]
            ]
        ]);
        $evalRes->assertOk();

        // Créer une action CAPA liée dans Module 04
        $capaRes = $this->postJson("/api/v1/qualite/inspections/{$inspectionId}/actions", [
            'title' => 'Mise en conformité émargement stupéfiants',
            'description' => 'Mettre en place un rappel visuel sur le registre des stupéfiants.',
            'owner_id' => $this->admin->id,
            'due_date' => now()->addDays(5)->toDateString(),
            'priority' => 'high',
            'effectiveness_criteria' => 'Zéro délivrance non émargée sur le contrôle de quinzaine.',
        ]);
        $capaRes->assertCreated();
        $this->assertNotNull($capaRes->json('data.action.id'));

        // Terminer le terrain
        $this->postJson("/api/v1/qualite/inspections/{$inspectionId}/transition/complete")->assertOk();

        // Rédiger et soumettre le rapport
        $reportRes = $this->postJson("/api/v1/qualite/inspections/{$inspectionId}/report", [
            'methodology' => 'Audit contradictoire sur pièce et sur place.',
            'summary_findings' => 'Procédure globalement respectée avec un écart mineur sur l’émargement.',
            'strengths' => 'Armoire sécurisée fermée à clé.',
            'weaknesses' => 'Délai d’émargement.',
            'conclusions' => 'Conformité sous réserve du traitement du point relevé.',
            'recommendations' => 'Audit flash dans 15 jours.',
        ]);
        $reportRes->assertOk();

        // Approuver et sceller le rapport (SHA-256)
        $signRes = $this->postJson("/api/v1/qualite/inspections/{$inspectionId}/sign", [
            'decision' => 'approve',
        ]);
        $signRes->assertOk();
        $this->assertNotNull($signRes->json('data.sha256_hash'));
        $this->assertEquals(64, strlen($signRes->json('data.sha256_hash')));

        // Évaluer l'inspecteur
        $evalInspRes = $this->postJson("/api/v1/qualite/inspections/{$inspectionId}/evaluate-inspector", [
            'inspector_id' => $this->inspector->id,
            'methodology_score' => 5,
            'objectivity_score' => 5,
            'reporting_score' => 4,
            'comments' => 'Audit rigoureux et impartial.',
        ]);
        $evalInspRes->assertOk();

        // Clôturer l'inspection
        $closeRes = $this->postJson("/api/v1/qualite/inspections/{$inspectionId}/transition/close");
        $closeRes->assertOk();
        $this->assertEquals('closed', $closeRes->json('data.status'));
    }
}

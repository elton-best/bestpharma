<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Qualite\Controllers\Module5InspectionController;
use App\Modules\Qualite\Models\Inspection;
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
                ],
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
                ],
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
                ],
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
                ],
            ],
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

    private function submittedInspection(): Inspection
    {
        $created = $this->postJson('/api/v1/qualite/inspections', [
            'title' => 'Preuve immuable',
            'process_scope' => 'Organisation Qualité',
            'objective' => 'Contrôle des procédures',
            'planned_date' => now()->toDateString(),
            'lead_inspector_id' => $this->inspector->id,
        ])->assertCreated();
        $id = $created->json('data.id');
        $this->postJson("/api/v1/qualite/inspections/{$id}/responses", [
            'responses' => [[
                'item_id' => $created->json('data.items.0.id'),
                'status' => 'non_conforme',
                'observed_facts' => 'Procédure absente',
                'evidence_notes' => 'Dossier contrôlé',
            ]],
        ])->assertOk();
        $this->postJson("/api/v1/qualite/inspections/{$id}/transition/complete")->assertOk();
        $this->postJson("/api/v1/qualite/inspections/{$id}/report", $this->reportPayload())->assertOk();

        return Inspection::findOrFail($id);
    }

    private function reportPayload(): array
    {
        return [
            'methodology' => 'Contrôle documentaire',
            'summary_findings' => 'Un écart identifié',
            'strengths' => 'Équipe disponible',
            'weaknesses' => 'Procédure absente',
            'conclusions' => 'Correction nécessaire',
            'recommendations' => 'Publier la procédure',
        ];
    }

    private function evidenceHash(Inspection $inspection): string
    {
        $inspection->refresh();

        return (new \ReflectionMethod(Module5InspectionController::class, 'evidenceHash'))
            ->invoke(new Module5InspectionController, $inspection, $inspection->report);
    }

    public function test_approved_evidence_rejects_all_overwrites_and_remains_verifiable_after_close(): void
    {
        $inspection = $this->submittedInspection();
        $base = "/api/v1/qualite/inspections/{$inspection->id}";
        $this->postJson("{$base}/sign", ['decision' => 'approve'])->assertOk();
        $report = $inspection->report()->firstOrFail()->getAttributes();
        $responses = $inspection->responses()->get()->toArray();
        $original = $inspection->fresh()->getAttributes();
        $this->assertSame($report['sha256_hash'], $this->evidenceHash($inspection));

        foreach (['approved', 'closed'] as $state) {
            if ($state === 'closed') {
                $this->postJson("{$base}/transition/close")->assertOk();
            }
            $this->postJson("{$base}/report", array_replace($this->reportPayload(), [
                'summary_findings' => 'Aucun écart : écrasement',
            ]))->assertStatus(409);
            $this->postJson("{$base}/responses", ['responses' => [[
                'item_id' => $inspection->items()->first()->id,
                'status' => 'conforme',
            ]]])->assertStatus(409);
            $this->putJson($base, [
                'title' => 'Titre falsifié', 'version' => $inspection->fresh()->version,
            ])->assertStatus(409);
            $this->postJson("{$base}/sign", ['decision' => 'reject'])->assertStatus(409);
            $this->postJson("{$base}/sign", ['decision' => 'approve'])->assertStatus(409);
            $this->postJson("{$base}/transition/start")->assertStatus(409);
            $this->assertSame($report, $inspection->report()->firstOrFail()->getAttributes());
            $this->assertSame($responses, $inspection->responses()->get()->toArray());
            $this->assertSame($original['title'], $inspection->fresh()->title);
            $this->assertSame($report['sha256_hash'], $this->evidenceHash($inspection));
        }
    }

    public function test_canonical_hash_covers_all_report_business_fields_inspection_items_team_and_findings(): void
    {
        $inspection = $this->submittedInspection();
        $originalHash = $this->evidenceHash($inspection);
        $this->assertSame($originalHash, $this->evidenceHash($inspection));
        $mutations = [];
        foreach (array_keys($this->reportPayload()) as $field) {
            $mutations[] = [$inspection->report, $field, 'Contenu différent'];
        }
        foreach (['title', 'process_scope', 'scope_description', 'objective'] as $field) {
            $mutations[] = [$inspection, $field, 'Donnée métier différente'];
        }
        $mutations[] = [$inspection, 'planned_date', now()->addDays(10)->toDateString()];
        foreach (['bpd_reference', 'chapter', 'requirement', 'guidance'] as $field) {
            $mutations[] = [$inspection->items()->first(), $field, 'Point de contrôle différent'];
        }
        foreach (['observed_facts', 'evidence_notes'] as $field) {
            $mutations[] = [$inspection->responses()->first(), $field, 'Constat différent'];
        }
        $mutations[] = [$inspection->responses()->first(), 'status', 'conforme'];
        $mutations[] = [$inspection->responses()->first(), 'finding_type', 'strength'];
        $mutations[] = [$inspection->inspectors()->first(), 'conflict_notes', 'Déclaration différente'];
        foreach ($mutations as [$model, $field, $value]) {
            $original = $model->getRawOriginal($field);
            $model->update([$field => $value]);
            $this->assertNotSame($originalHash, $this->evidenceHash($inspection), "Champ omis : {$model->getTable()}.{$field}");
            $model->update([$field => $original]);
            $this->assertSame($originalHash, $this->evidenceHash($inspection));
        }
    }

    public function test_foreign_item_cannot_be_used_to_modify_signed_inspection_evidence(): void
    {
        $signed = $this->submittedInspection();
        $this->postJson("/api/v1/qualite/inspections/{$signed->id}/sign", ['decision' => 'approve'])->assertOk();
        $other = $this->submittedInspection();
        $before = $other->responses()->get()->toArray();
        $this->postJson("/api/v1/qualite/inspections/{$other->id}/responses", ['responses' => [
            ['item_id' => $other->items()->first()->id, 'status' => 'conforme'],
            ['item_id' => $signed->items()->first()->id, 'status' => 'conforme'],
        ]])->assertStatus(422);
        $this->assertSame($before, $other->responses()->get()->toArray());
        $this->assertSame($signed->report()->first()->sha256_hash, $this->evidenceHash($signed));
    }

    public function test_rejected_report_can_be_corrected_then_approved_and_optional_password_is_checked(): void
    {
        $inspection = $this->submittedInspection();
        $base = "/api/v1/qualite/inspections/{$inspection->id}";
        $this->postJson("{$base}/sign", ['decision' => 'reject', 'reason' => 'Compléter'])->assertOk();
        $this->postJson("{$base}/sign", ['decision' => 'approve'])->assertStatus(409);
        $this->postJson("{$base}/report", $this->reportPayload())->assertOk();
        $this->postJson("{$base}/sign", ['decision' => 'approve', 'password' => 'wrong'])->assertStatus(422);
        $this->assertNull($inspection->report()->first()->sha256_hash);
        $this->postJson("{$base}/sign", ['decision' => 'approve', 'password' => 'Fictional12345'])->assertOk();
        $this->assertNull($inspection->report()->first()->rejection_reason);
    }

    public function test_inspection_version_prevents_stale_update_and_response_save_advances_version(): void
    {
        $inspection = $this->submittedInspection();
        $base = "/api/v1/qualite/inspections/{$inspection->id}";
        $version = $inspection->version;
        $this->postJson("{$base}/responses", ['responses' => [[
            'item_id' => $inspection->items()->first()->id, 'status' => 'conforme',
        ]]])->assertOk();
        $this->assertSame($version + 1, $inspection->fresh()->version);
        $this->putJson($base, ['version' => $version, 'title' => 'Écrasement concurrent'])->assertStatus(409);
        $this->putJson($base, ['version' => $version + 1, 'title' => 'Correction autorisée'])->assertOk();
    }

    public function test_seal_is_not_bypassed_by_inconsistent_legacy_statuses(): void
    {
        $inspection = $this->submittedInspection();
        $base = "/api/v1/qualite/inspections/{$inspection->id}";
        $this->postJson("{$base}/sign", ['decision' => 'approve'])->assertOk();
        // Historic/inconsistent statuses must never make an existing signature editable.
        $inspection->update(['status' => 'completed']);
        $inspection->report()->update(['status' => 'submitted']);
        $this->postJson("{$base}/report", $this->reportPayload())->assertStatus(409);
        $this->putJson($base, ['version' => $inspection->version, 'title' => 'Écrasement'])->assertStatus(409);
        $this->postJson("{$base}/sign", ['decision' => 'reject'])->assertStatus(409);
    }

    public function test_approval_failure_rolls_back_report_signature_and_inspection_together(): void
    {
        $inspection = $this->submittedInspection();
        $before = $inspection->report->getAttributes();
        $dispatcher = Inspection::getEventDispatcher();
        Inspection::setEventDispatcher(clone $dispatcher);
        Inspection::updating(function (Inspection $model): void {
            if ($model->status === 'approved') {
                throw new \RuntimeException('Simulated inspection write failure');
            }
        });
        $this->withoutExceptionHandling();
        try {
            $this->postJson("/api/v1/qualite/inspections/{$inspection->id}/sign", ['decision' => 'approve']);
            $this->fail('Approval must fail atomically.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Simulated inspection write failure', $exception->getMessage());
        } finally {
            Inspection::setEventDispatcher($dispatcher);
        }
        $this->assertSame($before, $inspection->report()->firstOrFail()->getAttributes());
        $this->assertSame('completed', $inspection->fresh()->status);
    }
}

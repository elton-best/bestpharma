<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Qualite\Models\QualityAction;
use App\Modules\Reporting\Models\NotificationJob;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Module14ReportingTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Officine $office;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::create([
            'name' => 'Responsable Pilotage M14',
            'email' => 'pilotage-m14@example.test',
            'password' => 'Fictional12345',
        ]);
        $this->office = Officine::create([
            'name' => 'Pharmacie Recette M14',
            'slug' => 'pharmacie-recette-m14',
            'status' => 'active',
        ]);

        DB::table('officine_user')->insert([
            'user_id' => $this->admin->id,
            'officine_id' => $this->office->id,
            'is_admin' => true,
            'is_active' => true,
            'permissions' => '[]',
        ]);
        DB::table('officine_modules')->insert([
            ['officine_id' => $this->office->id, 'module' => 'qualite', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'reporting', 'is_active' => true],
        ]);

        Sanctum::actingAs($this->admin);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    public function test_overview_computes_exact_metrics_and_non_disponible_on_zero_denominator(): void
    {
        // Aucun enregistrement -> dénominateur nul = "non disponible" (CDC 5 & 6)
        $emptyRes = $this->getJson('/api/v1/reporting/overview');
        $emptyRes->assertOk();
        $capaEmpty = collect($emptyRes->json('metrics'))->firstWhere('code', 'CAPA_CLOSURE_RATE');
        $this->assertEquals(0, $capaEmpty['denominator']);
        $this->assertEquals('non disponible', $capaEmpty['display_value']);

        // Ajout 2 CAPA dont 1 clôturée -> 50% exact (calcul depuis données sources)
        DB::table('quality_actions')->insert([
            [
                'officine_id' => $this->office->id,
                'created_by' => $this->admin->id,
                'title' => 'CAPA 1',
                'chapter' => 'Qualité',
                'severity' => 'medium',
                'owner' => 'Admin',
                'due_date' => now()->addDays(5)->toDateString(),
                'status' => 'closed',
                'description' => 'Desc',
                'resolution' => 'Ok',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'officine_id' => $this->office->id,
                'created_by' => $this->admin->id,
                'title' => 'CAPA 2',
                'chapter' => 'Qualité',
                'severity' => 'medium',
                'owner' => 'Admin',
                'due_date' => now()->addDays(5)->toDateString(),
                'status' => 'open',
                'description' => 'Desc 2',
                'resolution' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $res = $this->getJson('/api/v1/reporting/overview');
        $res->assertOk();
        $capaLive = collect($res->json('metrics'))->firstWhere('code', 'CAPA_CLOSURE_RATE');
        $this->assertEquals(1, $capaLive['numerator']);
        $this->assertEquals(2, $capaLive['denominator']);
        $this->assertEquals(50.0, (float) $capaLive['value']);
        $this->assertEquals('50 %', $capaLive['display_value']);
    }

    public function test_scheduled_template_requires_business_consent_and_recipients(): void
    {
        // Sans consentement métier -> 422
        $this->postJson('/api/v1/reporting/templates', [
            'code' => 'TPL-HEBDO',
            'title' => 'Rapport Hebdomadaire SMQ',
            'metric_codes' => ['CAPA_CLOSURE_RATE'],
            'is_scheduled' => true,
            'consent_confirmed' => false,
        ])->assertStatus(422);

        // Avec consentement et destinataire -> 201
        $this->postJson('/api/v1/reporting/templates', [
            'code' => 'TPL-HEBDO',
            'title' => 'Rapport Hebdomadaire SMQ',
            'metric_codes' => ['CAPA_CLOSURE_RATE'],
            'is_scheduled' => true,
            'consent_confirmed' => true,
            'cron_schedule' => '0 8 * * 1',
            'recipients' => [$this->admin->id],
        ])->assertCreated();
    }

    public function test_report_run_generation_and_audited_csv_export(): void
    {
        $runRes = $this->postJson('/api/v1/reporting/runs', [
            'reference' => 'RPT-2026-01',
            'title' => 'Bilan Qualité & Stocks Mensuel',
            'period_start' => now()->subDays(30)->toDateString(),
            'period_end' => now()->toDateString(),
        ]);
        $runRes->assertCreated();
        $runId = $runRes->json('data.id');
        $this->assertNotEmpty($runRes->json('data.computed_metrics'));

        $expRes = $this->postJson("/api/v1/reporting/runs/{$runId}/export", ['format' => 'csv']);
        $expRes->assertCreated();
        $this->assertTrue($expRes->json('data.filtered_sensitive_fields'));
        $this->assertNotEmpty($expRes->json('data.file_checksum_sha256'));
        $this->assertStringContainsString('CAPA_CLOSURE_RATE', $expRes->json('content'));
    }

    public function test_inter_officine_comparison_denies_unauthorized_office(): void
    {
        $otherOffice = Officine::create([
            'name' => 'Pharmacie Non Autorisée',
            'slug' => 'pharmacie-non-autorisee-m14',
            'status' => 'active',
        ]);

        // Sans accès actif sur $otherOffice -> 403 (CDC 3.3 & 7)
        $this->postJson('/api/v1/reporting/compare-officines', [
            'compare_officine_id' => $otherOffice->id,
            'period_start' => now()->subDays(7)->toDateString(),
            'period_end' => now()->toDateString(),
        ])->assertStatus(403);

        // Ajout appartenance active -> comparaison autorisée 200
        DB::table('officine_user')->insert([
            'user_id' => $this->admin->id,
            'officine_id' => $otherOffice->id,
            'is_admin' => true,
            'is_active' => true,
            'permissions' => '[]',
        ]);

        $okRes = $this->postJson('/api/v1/reporting/compare-officines', [
            'compare_officine_id' => $otherOffice->id,
            'period_start' => now()->subDays(7)->toDateString(),
            'period_end' => now()->toDateString(),
        ]);
        $okRes->assertOk();
        $this->assertEquals($this->office->id, $okRes->json('primary.officine_id'));
        $this->assertEquals($otherOffice->id, $okRes->json('comparison.officine_id'));
    }

    public function test_failed_notification_job_remains_retryable(): void
    {
        $job = NotificationJob::create([
            'officine_id' => $this->office->id,
            'recipient_user_id' => $this->admin->id,
            'channel' => 'email',
            'status' => 'echec',
            'attempts' => 1,
            'last_error' => 'SMTP timeout',
            'scheduled_for' => now()->subMinute(),
        ]);

        $retryRes = $this->postJson("/api/v1/reporting/notification-jobs/{$job->id}/retry");
        $retryRes->assertOk();
        $this->assertEquals('envoye', $retryRes->json('data.status'));
        $this->assertEquals(2, $retryRes->json('data.attempts'));
    }
}

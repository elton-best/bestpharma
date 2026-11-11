<?php
namespace Tests\Feature;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DocumentLibraryTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Officine $office;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->admin = User::create(['name' => 'GED Admin', 'email' => 'ged-admin@example.test', 'password' => bcrypt('Password123!')]);
        $this->office = Officine::create(['name' => 'GED Office', 'slug' => 'ged-office', 'status' => 'active']);
        DB::table('officine_user')->insert(['user_id' => $this->admin->id, 'officine_id' => $this->office->id, 'is_admin' => true, 'is_active' => true, 'permissions' => '[]']);
        DB::table('officine_modules')->insert(['officine_id' => $this->office->id, 'module' => 'documents', 'is_active' => true]);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
        Sanctum::actingAs($this->admin);
    }

    public function test_source_import_is_idempotent_quarantined_until_human_approval_and_template_is_immutable(): void
    {
        $path = '/api/v1/documents/library';
        $upload = fn () => UploadedFile::fake()->createWithContent('guide.pdf', '%PDF-1.4 test source');
        $first = $this->postJson($path.'/sources/import', ['source_kind' => 'bpd', 'provenance' => 'Document reçu du titulaire, lot recette', 'file' => $upload()])->assertCreated()->assertJsonPath('data.status', 'quarantine');
        $again = $this->postJson($path.'/sources/import', ['source_kind' => 'bpd', 'provenance' => 'Document reçu du titulaire, lot recette', 'file' => $upload()])->assertOk()->assertJsonPath('created', false);
        $this->assertSame($first->json('data.id'), $again->json('data.id'));
        $this->assertFalse($first->json('data.abmed_validated') ?? false);
        $sourceId = $first->json('data.id');

        $this->postJson("$path/sources/$sourceId/approve", ['password' => 'Password123!', 'sha256' => $first->json('data.sha256'), 'confirmed' => true])->assertConflict();
        $this->postJson("$path/sources/$sourceId/qualify", ['document_code' => 'BPD-REVIEW', 'document_kind' => 'procedure', 'process' => 'QAM', 'qualification_note' => 'Code vérifié sur le cartouche original.'])->assertOk()->assertJsonPath('data.status', 'qualified');
        $this->postJson("$path/sources/$sourceId/approve", ['password' => 'Password123!', 'sha256' => $first->json('data.sha256'), 'confirmed' => true])->assertOk()->assertJsonPath('data.status', 'approved');
        $template = $this->postJson($path.'/templates', ['source_id' => $sourceId, 'name' => 'Canevas contrôlé', 'fields' => [['key' => 'objectif', 'label' => 'Objectif', 'type' => 'text']]])->assertCreated()->json('data');
        $this->postJson($path.'/templates/'.$template['id'].'/instances', ['values' => ['objectif' => 'Contrôle']])->assertConflict();
        $this->postJson($path.'/templates/'.$template['id'].'/approve', ['password' => 'Password123!', 'sha256' => $template['sha256'], 'confirmed' => true])->assertOk();
        $instance = $this->postJson($path.'/templates/'.$template['id'].'/instances', ['values' => ['objectif' => 'Contrôle']])->assertCreated();
        $this->assertSame($template['sha256'], json_decode($instance->json('data.content'), true)['template']['sha256']);
        $this->getJson($path.'/status')->assertOk()->assertJsonPath('available', false)->assertJsonPath('approved_bpd_sources', 1);
    }

    public function test_followups_are_versioned_and_stale_edits_conflict(): void
    {
        $url = '/api/v1/documents/library/followups/formations';
        $created = $this->postJson($url, ['status' => 'planned', 'data' => ['theme' => 'Chaîne du froid', 'responsable_suivi' => 'Titulaire']])->assertCreated();
        $id = $created->json('data.id');
        $edit = ['version' => 1, 'status' => 'completed', 'data' => ['theme' => 'Chaîne du froid', 'responsable_suivi' => 'Titulaire'], 'reason' => 'Session réalisée et bilan consigné.'];
        $this->putJson('/api/v1/documents/library/followups/'.$id, $edit)->assertOk()->assertJsonPath('data.version', 2);
        $this->putJson('/api/v1/documents/library/followups/'.$id, $edit)->assertConflict();
        $this->assertDatabaseCount('document_followup_events', 2);
    }
}

<?php
declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Documents\Controllers\ReferenceCorpusController;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class ReferenceCorpusTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/documents/library/reference-corpus';
    private string $fixtureRoot;
    private array $entry;
    private User $user;
    private Officine $office;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->fixtureRoot = storage_path('framework/testing/reference-corpus-'.Str::uuid());
        File::ensureDirectoryExists($this->fixtureRoot.'/sources/forms');
        file_put_contents($this->fixtureRoot.'/sources/forms/example.docx', 'reference source bytes');
        $this->entry = ['id' => str_repeat('a', 24), 'titre' => 'Fiche qualité', 'rubrique' => 'MAITRISE DOCUMENTAIRE',
            'fichier' => 'forms/example.docx', 'sha256' => hash('sha256', 'reference source bytes'),
            'parties' => [['origine' => 'document', 'blocs' => [['type' => 'paragraphe', 'texte' => 'Contenu de référence']]]], 'images' => []];
        $this->writeCatalogue([$this->entry]);
        config(['reference_corpus.catalogue_path' => $this->fixtureRoot.'/catalogue.json', 'reference_corpus.source_root' => $this->fixtureRoot.'/sources']);
        $this->user = User::create(['name' => 'Corpus Admin', 'email' => 'corpus@example.test', 'password' => bcrypt('Password123!')]);
        $this->office = Officine::create(['name' => 'Corpus Office', 'slug' => 'corpus-office', 'status' => 'active']);
        DB::table('officine_user')->insert(['user_id' => $this->user->id, 'officine_id' => $this->office->id,
            'is_admin' => true, 'is_active' => true, 'permissions' => '[]']);
        DB::table('officine_modules')->insert(['officine_id' => $this->office->id, 'module' => 'documents', 'is_active' => true]);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
        Sanctum::actingAs($this->user);
    }

    protected function tearDown(): void
    {
        if (isset($this->fixtureRoot)) File::deleteDirectory($this->fixtureRoot);
        parent::tearDown();
    }

    public function test_real_catalogue_counts_content_and_all_source_hashes(): void
    {
        $path = dirname(base_path()).'/references/canevas/catalogue.json';
        $root = dirname(base_path()).'/0000. DIGIT ABMEB';
        // Allows the same real-corpus test in a container using read-only mounts.
        $path = getenv('REFERENCE_CORPUS_CATALOGUE_PATH') ?: $path;
        $root = getenv('REFERENCE_CORPUS_SOURCE_ROOT') ?: $root;
        if (!is_file($path) || !is_dir($root)) $this->markTestSkipped('Real corpus must be mounted read-only.');
        config(['reference_corpus.catalogue_path' => $path, 'reference_corpus.source_root' => $root]);
        $catalogue = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
        $response = $this->getJson(self::URL)->assertOk()
            ->assertJsonPath('meta.total', count($catalogue['canevas']))
            ->assertJsonPath('meta.filtered', count($catalogue['canevas']))
            ->assertJsonPath('meta.integrity.verified', count($catalogue['canevas']))
            ->assertJsonPath('meta.approval_status', 'reference_only');
        $this->assertCount(62, $response->json('data'));
        $entry = $catalogue['canevas'][0];
        $this->getJson(self::URL.'/'.$entry['id'])->assertOk()->assertJsonPath('data.parties', $entry['parties']);
        $this->assertDatabaseCount('document_sources', 0);
        $this->assertDatabaseCount('documents', 0);
    }

    public function test_filters_counts_content_and_safe_download(): void
    {
        $second = array_replace($this->entry, ['id' => str_repeat('b', 24), 'titre' => 'Maintenance', 'rubrique' => 'EQUIPEMENTS']);
        $this->writeCatalogue([$this->entry, $second]);
        $this->getJson(self::URL.'?search=QUALITE&rubrique=MAITRISE%20DOCUMENTAIRE')->assertOk()
            ->assertJsonPath('meta.total', 2)->assertJsonPath('meta.filtered', 1)
            ->assertJsonPath('data.0.integrity.status', 'verified')->assertJsonMissingPath('data.0.parties');
        $this->getJson(self::URL.'?search=absent')->assertOk()->assertJsonPath('meta.filtered', 0);
        $this->getJson(self::URL.'/'.$this->entry['id'])->assertOk()->assertJsonPath('data.parties', $this->entry['parties']);
        $this->get(self::URL.'/'.$this->entry['id'].'/file')->assertOk()->assertDownload('example.docx')
            ->assertHeader('X-Reference-SHA256', $this->entry['sha256'])->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertDatabaseCount('document_sources', 0);
    }

    public function test_hash_is_recomputed_after_source_changes(): void
    {
        $this->getJson(self::URL)->assertOk()->assertJsonPath('meta.integrity.verified', 1);
        file_put_contents($this->fixtureRoot.'/sources/forms/example.docx', 'altered');
        $this->getJson(self::URL)->assertOk()->assertJsonPath('data.0.integrity.status', 'mismatch')
            ->assertJsonPath('data.0.integrity.actual_sha256', hash('sha256', 'altered'));
        $this->getJson(self::URL.'/'.$this->entry['id'].'/file')->assertConflict();
    }

    public function test_traversal_absolute_paths_and_encoded_paths_are_rejected_without_path_leak(): void
    {
        foreach (['../catalogue.json', '/etc/passwd', 'forms/../../catalogue.json', 'forms\\..\\secret', '%2e%2e/secret', 'file:///etc/passwd'] as $unsafe) {
            $this->writeCatalogue([array_replace($this->entry, ['fichier' => $unsafe])]);
            $this->getJson(self::URL)->assertOk()->assertJsonPath('data.0.fichier', null)->assertJsonPath('data.0.integrity.status', 'unsafe');
            $response = $this->getJson(self::URL.'/'.$this->entry['id'].'/file')->assertNotFound();
            $this->assertStringNotContainsString($this->fixtureRoot, $response->getContent());
        }
        $this->getJson(self::URL.'/not-a-corpus-id/file')->assertNotFound();
    }

    public function test_symlink_escape_and_missing_source_are_not_downloadable(): void
    {
        unlink($this->fixtureRoot.'/sources/forms/example.docx');
        $this->getJson(self::URL)->assertOk()->assertJsonPath('data.0.integrity.status', 'missing');
        $this->getJson(self::URL.'/'.$this->entry['id'].'/file')->assertNotFound();
        symlink($this->fixtureRoot.'/catalogue.json', $this->fixtureRoot.'/sources/forms/example.docx');
        $this->getJson(self::URL)->assertOk()->assertJsonPath('data.0.integrity.status', 'unsafe');
        $this->getJson(self::URL.'/'.$this->entry['id'].'/file')->assertNotFound();
    }

    public function test_reader_cannot_consult_nominative_content_or_sources_but_manager_can(): void
    {
        $this->permissions(['documents.read']);
        $this->getJson(self::URL)->assertOk();
        $this->getJson(self::URL.'/'.$this->entry['id'])->assertForbidden();
        $this->getJson(self::URL.'/'.$this->entry['id'].'/file')->assertForbidden();
        $this->permissions(['documents.manage']);
        $this->getJson(self::URL.'/'.$this->entry['id'])->assertOk();
        $this->getJson(self::URL.'/'.$this->entry['id'].'/file')->assertOk()->assertDownload();
        $this->permissions([]);
        $this->getJson(self::URL)->assertForbidden();
    }

    public function test_other_tenant_inactive_membership_and_disabled_module_are_denied(): void
    {
        $other = Officine::create(['name' => 'Other', 'slug' => 'corpus-other', 'status' => 'active']);
        $this->withHeader('X-Officine-ID', (string) $other->id)->getJson(self::URL)->assertForbidden();
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
        DB::table('officine_user')->where('user_id', $this->user->id)->update(['is_active' => false]);
        $this->getJson(self::URL)->assertForbidden();
        DB::table('officine_user')->where('user_id', $this->user->id)->update(['is_active' => true]);
        DB::table('officine_modules')->where('officine_id', $this->office->id)->update(['is_active' => false]);
        $this->getJson(self::URL)->assertForbidden();
    }

    public function test_anonymous_access_is_denied_and_query_filters_are_validated(): void
    {
        $this->getJson(self::URL.'?search[]=invalid')->assertUnprocessable();
        $this->app['auth']->forgetGuards();
        $this->getJson(self::URL)->assertUnauthorized();
        $this->getJson(self::URL.'/'.$this->entry['id'])->assertUnauthorized();
        $this->getJson(self::URL.'/'.$this->entry['id'].'/file')->assertUnauthorized();
    }

    public function test_active_tenant_role_can_grant_manage_permission(): void
    {
        $this->permissions([]);
        $role = DB::table('officine_roles')->insertGetId(['officine_id' => $this->office->id, 'name' => 'Gestionnaire documentaire',
            'permissions' => json_encode(['documents.manage']), 'is_active' => true]);
        $membership = DB::table('officine_user')->where('user_id', $this->user->id)->where('officine_id', $this->office->id)->value('id');
        DB::table('officine_member_roles')->insert(['membership_id' => $membership, 'role_id' => $role]);
        $this->getJson(self::URL.'/'.$this->entry['id'])->assertOk();
        DB::table('officine_roles')->where('id', $role)->update(['is_active' => false]);
        $this->getJson(self::URL.'/'.$this->entry['id'])->assertForbidden();
    }

    public function test_missing_and_invalid_catalogue_fail_closed(): void
    {
        file_put_contents($this->fixtureRoot.'/catalogue.json', '{broken');
        $this->getJson(self::URL)->assertStatus(503);
        $this->writeCatalogue([$this->entry, $this->entry]);
        $this->getJson(self::URL)->assertStatus(503);
        unlink($this->fixtureRoot.'/catalogue.json');
        $response = $this->getJson(self::URL)->assertStatus(503);
        $this->assertStringNotContainsString($this->fixtureRoot, $response->getContent());
    }

    public function test_controller_also_requires_resolved_tenant_context(): void
    {
        $request = \Illuminate\Http\Request::create('/');
        $request->setUserResolver(fn () => $this->user);
        $request->attributes->set('officine.is_admin', true);
        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        app(ReferenceCorpusController::class)->index($request);
    }

    public function test_reference_import_is_private_quarantined_audited_and_idempotent(): void
    {
        $this->permissions(['documents.manage', 'documents.write']);
        $url = self::URL.'/'.$this->entry['id'].'/imports';
        $created = $this->postJson($url)->assertCreated()->assertJsonPath('created', true)
            ->assertJsonPath('data.status', 'quarantine')->assertJsonPath('data.source_kind', 'corpus')
            ->assertJsonPath('data.officine_id', $this->office->id)->assertJsonMissingPath('data.private_path');
        $id = $created->json('data.id');
        $row = DB::table('document_sources')->where('id', $id)->first();
        $this->assertStringStartsWith($this->office->id.'/quarantine/', $row->private_path);
        $this->assertSame('reference source bytes', Storage::disk('local')->get($row->private_path));
        $this->assertSame('private', Storage::disk('local')->getVisibility($row->private_path));
        $this->assertSame($this->entry['sha256'], hash_file('sha256', Storage::disk('local')->path($row->private_path)));
        $this->assertStringContainsString($this->entry['id'], $row->provenance);
        $this->assertStringContainsString($this->entry['rubrique'], $row->provenance);
        $this->assertNull($row->qualified_by);
        $this->assertNull($row->approved_by);
        $this->assertDatabaseHas('document_source_events', ['officine_id' => $this->office->id,
            'source_id' => $id, 'actor_id' => $this->user->id, 'action' => 'imported']);
        $this->postJson($url)->assertOk()->assertJsonPath('created', false)->assertJsonPath('data.id', $id);
        $this->assertDatabaseCount('document_sources', 1);
        $this->assertDatabaseCount('document_source_events', 1);
        $this->assertCount(1, Storage::disk('local')->allFiles());
        $this->assertDatabaseCount('documents', 0);
        $this->assertDatabaseCount('document_template_versions', 0);
    }

    public function test_reimport_never_overwrites_qualified_or_approved_source(): void
    {
        $url = self::URL.'/'.$this->entry['id'].'/imports';
        $id = $this->postJson($url)->assertCreated()->json('data.id');
        foreach (['qualified', 'approved'] as $status) {
            DB::table('document_sources')->where('id', $id)->update(['status' => $status,
                'document_code' => 'HUMAN-REVIEW', 'qualification_note' => 'Conserver cette qualification humaine.']);
            $before = DB::table('document_sources')->where('id', $id)->first();
            $this->postJson($url)->assertOk()->assertJsonPath('created', false)->assertJsonPath('data.status', $status);
            $this->assertEquals($before, DB::table('document_sources')->where('id', $id)->first());
        }
        $this->assertDatabaseCount('document_source_events', 1);
        $this->assertCount(1, Storage::disk('local')->allFiles());
    }

    public function test_import_requires_both_write_and_manage_permissions(): void
    {
        $url = self::URL.'/'.$this->entry['id'].'/imports';
        foreach ([['documents.write'], ['documents.manage'], ['documents.read'], []] as $permissions) {
            $this->permissions($permissions);
            $this->postJson($url)->assertForbidden();
        }
        $this->assertDatabaseCount('document_sources', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
        $this->permissions(['documents.manage', 'documents.write']);
        $this->postJson($url)->assertCreated();
    }

    public function test_altered_archive_is_refused_before_copy_even_after_prior_import(): void
    {
        $url = self::URL.'/'.$this->entry['id'].'/imports';
        file_put_contents($this->fixtureRoot.'/sources/forms/example.docx', 'altered');
        $this->postJson($url)->assertConflict();
        $this->assertDatabaseCount('document_sources', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
        file_put_contents($this->fixtureRoot.'/sources/forms/example.docx', 'reference source bytes');
        $this->postJson($url)->assertCreated();
        file_put_contents($this->fixtureRoot.'/sources/forms/example.docx', 'altered again');
        $this->postJson($url)->assertConflict();
        $this->assertDatabaseCount('document_sources', 1);
        $this->assertCount(1, Storage::disk('local')->allFiles());
    }

    public function test_same_reference_in_two_tenants_has_distinct_private_copies(): void
    {
        $url = self::URL.'/'.$this->entry['id'].'/imports';
        $a = $this->postJson($url)->assertCreated()->json('data.id');
        $other = Officine::create(['name' => 'Import Other', 'slug' => 'corpus-import-other', 'status' => 'active']);
        $this->withHeader('X-Officine-ID', (string) $other->id)->postJson($url)->assertForbidden();
        DB::table('officine_user')->insert(['user_id' => $this->user->id, 'officine_id' => $other->id,
            'is_admin' => true, 'is_active' => true, 'permissions' => '[]']);
        DB::table('officine_modules')->insert(['officine_id' => $other->id, 'module' => 'documents', 'is_active' => true]);
        $b = $this->postJson($url)->assertCreated()->assertJsonPath('data.officine_id', $other->id)->json('data.id');
        $this->assertNotSame($a, $b);
        $rowA = DB::table('document_sources')->where('id', $a)->first();
        $rowB = DB::table('document_sources')->where('id', $b)->first();
        $this->assertNotSame($rowA->private_path, $rowB->private_path);
        $this->assertStringStartsWith($other->id.'/quarantine/', $rowB->private_path);
        $this->assertSame($rowA->sha256, $rowB->sha256);
        $this->postJson($url)->assertOk()->assertJsonPath('data.id', $b)->assertJsonPath('created', false);
        $this->getJson('/api/v1/documents/library/sources/'.$a.'/file')->assertNotFound();
        $this->getJson('/api/v1/documents/library/sources/'.$b.'/file')->assertOk()->assertDownload();
        $this->assertCount(2, Storage::disk('local')->allFiles());
        $this->assertDatabaseCount('document_source_events', 2);
        $this->assertDatabaseCount('documents', 0);
        $this->assertDatabaseCount('document_template_versions', 0);
    }

    public function test_audit_database_error_rolls_back_source_row_and_private_file(): void
    {
        DB::listen(static function (\Illuminate\Database\Events\QueryExecuted $query): void {
            if (str_starts_with(strtolower($query->sql), 'insert into "document_source_events"')) {
                throw new \RuntimeException('Simulated audit failure');
            }
        });
        $this->withoutExceptionHandling();
        try {
            $this->postJson(self::URL.'/'.$this->entry['id'].'/imports');
            $this->fail('The audit failure should abort the import.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Simulated audit failure', $exception->getMessage());
        }
        $this->assertDatabaseCount('document_sources', 0);
        $this->assertDatabaseCount('document_source_events', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_copy_hash_is_checked_and_corrupt_copy_is_removed(): void
    {
        $disk = Storage::disk('local');
        $proxy = \Mockery::mock($disk);
        $proxy->shouldReceive('put')->once()->andReturnUsing(static function ($key, $stream, $options) use ($disk): bool {
            $disk->put($key, $stream, $options);
            $disk->put($key, 'corrupted copy');
            return true;
        });
        Storage::shouldReceive('disk')->with('local')->andReturn($proxy);
        $this->postJson(self::URL.'/'.$this->entry['id'].'/imports')->assertConflict();
        $this->assertDatabaseCount('document_sources', 0);
        $this->assertDatabaseCount('document_source_events', 0);
        $this->assertSame([], $disk->allFiles());
    }

    public function test_unique_constraint_race_keeps_winning_source_and_removes_losing_copy(): void
    {
        $winnerKey = $this->office->id.'/quarantine/winning-import';
        Storage::disk('local')->put($winnerKey, 'reference source bytes', ['visibility' => 'private']);
        $inserted = false;
        DB::listen(function (\Illuminate\Database\Events\QueryExecuted $query) use (&$inserted, $winnerKey): void {
            if ($inserted || !str_starts_with(strtolower($query->sql), 'select') || !str_contains($query->sql, '"document_sources"')) return;
            // The first lookup already returned no rows. Simulate a competing import
            // winning before this attempt inserts, exercising the unique-key recovery.
            $inserted = true;
            DB::table('document_sources')->insert([
                'officine_id' => $this->office->id, 'source_kind' => 'corpus', 'original_name' => 'example.docx',
                'private_path' => $winnerKey, 'bytes' => 22, 'sha256' => $this->entry['sha256'],
                'provenance' => 'Existing competing archive import', 'status' => 'qualified',
            ]);
        });
        $this->postJson(self::URL.'/'.$this->entry['id'].'/imports')->assertOk()
            ->assertJsonPath('created', false)->assertJsonPath('data.status', 'qualified');
        $this->assertDatabaseCount('document_sources', 1);
        $this->assertSame([$winnerKey], Storage::disk('local')->allFiles());
    }

    private function permissions(array $permissions): void
    {
        DB::table('officine_user')->where('user_id', $this->user->id)->where('officine_id', $this->office->id)
            ->update(['is_admin' => false, 'permissions' => json_encode($permissions, JSON_THROW_ON_ERROR)]);
    }

    private function writeCatalogue(array $entries): void
    {
        file_put_contents($this->fixtureRoot.'/catalogue.json', json_encode([
            'schema' => 'begpharma.canevas.v1', 'canevas' => $entries, 'non_integres' => [],
        ], JSON_THROW_ON_ERROR));
    }
}

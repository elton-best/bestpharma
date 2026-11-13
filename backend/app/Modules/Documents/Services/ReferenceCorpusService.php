<?php
declare(strict_types=1);

namespace App\Modules\Documents\Services;

use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/** Shared reference material, never an approved tenant document or template. */
final class ReferenceCorpusService
{
    public function __construct(
        private readonly ?string $cataloguePath = null,
        private readonly ?string $sourceRoot = null,
    ) {}

    public function catalogue(?string $rubrique = null, ?string $search = null): array
    {
        $catalogue = $this->load();
        $rows = [];
        $rubriques = [];
        $integrity = ['verified' => 0, 'mismatch' => 0, 'missing' => 0, 'unsafe' => 0];
        foreach ($catalogue['canevas'] as $entry) {
            $state = $this->integrity($entry);
            $integrity[$state['status']]++;
            $rubriques[$entry['rubrique']] = ($rubriques[$entry['rubrique']] ?? 0) + 1;
            if ($rubrique !== null && $entry['rubrique'] !== $rubrique) continue;
            if ($search !== null && $search !== '' && !str_contains(
                Str::lower(Str::ascii($entry['titre'].' '.$entry['rubrique'])),
                Str::lower(Str::ascii($search)),
            )) continue;
            $rows[] = $this->summary($entry, $state);
        }
        ksort($rubriques);

        return ['schema' => $catalogue['schema'], 'data' => $rows, 'meta' => [
            'total' => count($catalogue['canevas']), 'filtered' => count($rows),
            'non_integres_count' => count($catalogue['non_integres']),
            'rubriques' => array_map(static fn ($name, $count) => ['rubrique' => $name, 'count' => $count], array_keys($rubriques), array_values($rubriques)),
            'integrity' => $integrity, 'approval_status' => 'reference_only',
        ]];
    }

    public function detail(string $id): array
    {
        $entry = $this->entry($id);
        return $this->summary($entry, $this->integrity($entry)) + [
            'parties' => $entry['parties'], 'images' => $entry['images'],
        ];
    }

    /** Only IDs are accepted from HTTP; catalogue paths are still treated as untrusted. */
    public function verifiedSource(string $id): array
    {
        $entry = $this->entry($id);
        $path = $this->safePath($entry['fichier']);
        abort_unless($path !== null && is_file($path) && is_readable($path), 404, 'Source indisponible.');
        $actual = @hash_file('sha256', $path);
        abort_unless(is_string($actual) && hash_equals($entry['sha256'], $actual), 409, 'Empreinte de la source altérée.');
        return ['path' => $path, 'name' => basename($entry['fichier']), 'sha256' => $actual,
            'reference_id' => $entry['id'], 'rubrique' => $entry['rubrique']];
    }

    /** Explicit adoption uses the existing GED source lifecycle, never approval. */
    public function importSource(string $id, int $tenant, int $actor): array
    {
        abort_unless($tenant > 0 && $actor > 0, 403, 'Contexte officine requis.');
        // Always check the archive, including before returning an existing adoption.
        $source = $this->verifiedSource($id);
        $existing = $this->importedSource($tenant, $source['sha256']);
        if ($existing !== null) return ['data' => $existing, 'created' => false];

        $disk = Storage::disk('local');
        $key = $tenant.'/quarantine/'.Str::uuid();
        try {
            $stream = @fopen($source['path'], 'rb');
            abort_unless(is_resource($stream), 404, 'Source indisponible.');
            try {
                abort_unless($disk->put($key, $stream, ['visibility' => 'private']), 500, 'Copie privée impossible.');
            } finally {
                fclose($stream);
            }
            $copy = $disk->path($key);
            $hash = @hash_file('sha256', $copy);
            abort_unless(is_string($hash) && hash_equals($source['sha256'], $hash), 409, 'Empreinte de la copie altérée.');
            $bytes = @filesize($copy);
            abort_unless(is_int($bytes), 500, 'Vérification de la copie impossible.');
            $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($copy) ?: 'application/octet-stream';
            return DB::transaction(function () use ($tenant, $actor, $source, $key, $bytes, $mime): array {
                $id = DB::table('document_sources')->insertGetId([
                    'officine_id' => $tenant, 'source_kind' => 'corpus',
                    'original_name' => $source['name'], 'private_path' => $key, 'mime' => $mime,
                    'bytes' => $bytes, 'sha256' => $source['sha256'],
                    'provenance' => Str::limit('Archive 0000. DIGIT ABMEB | référence '.$source['reference_id'].' | rubrique '.$source['rubrique'], 500, ''),
                    'status' => 'quarantine', 'imported_by' => $actor,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                // Same event vocabulary as DocumentLibraryController::import.
                // No filename, extracted content or personal data in the audit event.
                DB::table('document_source_events')->insert([
                    'officine_id' => $tenant, 'source_id' => $id, 'actor_id' => $actor,
                    'action' => 'imported', 'created_at' => now(),
                ]);
                return ['data' => $this->importedSource($tenant, $source['sha256']), 'created' => true];
            });
        } catch (\Throwable $exception) {
            // Only this attempt's UUID is deleted, never a pre-existing source file.
            $disk->delete($key);
            if ($exception instanceof UniqueConstraintViolationException) {
                // The transaction has rolled back before looking up the winning import.
                $existing = $this->importedSource($tenant, $source['sha256']);
                if ($existing !== null) return ['data' => $existing, 'created' => false];
            }
            throw $exception;
        }
    }

    private function importedSource(int $tenant, string $hash): ?object
    {
        return DB::table('document_sources')->where('officine_id', $tenant)
            ->where('source_kind', 'corpus')->where('sha256', $hash)
            ->first(['id', 'officine_id', 'source_kind', 'original_name', 'mime', 'bytes', 'sha256',
                'provenance', 'status', 'imported_by', 'created_at', 'updated_at']);
    }

    private function summary(array $entry, array $integrity): array
    {
        // Do not expose the server path or images/large content in list responses.
        return [
            'id' => $entry['id'], 'titre' => $entry['titre'], 'rubrique' => $entry['rubrique'],
            'fichier' => $this->safeRelativePath($entry['fichier']) ? $entry['fichier'] : null,
            'sha256' => $entry['sha256'], 'parties_count' => count($entry['parties']),
            'images_count' => count($entry['images']), 'integrity' => $integrity,
            'approval_status' => 'reference_only',
        ];
    }

    private function entry(string $id): array
    {
        abort_unless(preg_match('/\A[a-f0-9]{24}\z/D', $id) === 1, 404);
        foreach ($this->load()['canevas'] as $entry) {
            if ($entry['id'] === $id) return $entry;
        }
        abort(404);
    }

    private function integrity(array $entry): array
    {
        if (!$this->safeRelativePath($entry['fichier'])) return ['status' => 'unsafe', 'actual_sha256' => null];
        $path = $this->safePath($entry['fichier']);
        if ($path === null) return ['status' => 'unsafe', 'actual_sha256' => null];
        $actual = is_file($path) && is_readable($path) ? @hash_file('sha256', $path) : false;
        if (!is_string($actual)) return ['status' => 'missing', 'actual_sha256' => null];
        return ['status' => hash_equals($entry['sha256'], $actual) ? 'verified' : 'mismatch', 'actual_sha256' => $actual];
    }

    private function safeRelativePath(string $relative): bool
    {
        if ($relative === '' || preg_match('/[\x00-\x1F\x7F\\\\:%]/', $relative)) return false;
        foreach (explode('/', $relative) as $segment) {
            if ($segment === '' || $segment === '.' || $segment === '..') return false;
        }
        return true;
    }

    private function safePath(string $relative): ?string
    {
        if (!$this->safeRelativePath($relative)) return null;
        $root = realpath($this->sourceRoot ?? config('reference_corpus.source_root', dirname(base_path()).'/0000. DIGIT ABMEB'));
        if ($root === false) return null;
        $candidate = $root.DIRECTORY_SEPARATOR.$relative;
        // Resolve each existing component so a symlink (including a dangling one)
        // can never make a source escape the fixed corpus root.
        $current = $root;
        foreach (explode('/', $relative) as $segment) {
            $current .= DIRECTORY_SEPARATOR.$segment;
            if (is_link($current)) return null;
        }
        $resolved = realpath($candidate);
        if ($resolved === false) return $candidate;
        return str_starts_with($resolved, $root.DIRECTORY_SEPARATOR) ? $resolved : null;
    }

    private function load(): array
    {
        $json = @file_get_contents($this->cataloguePath ?? config('reference_corpus.catalogue_path', dirname(base_path()).'/references/canevas/catalogue.json'));
        abort_unless(is_string($json), 503, 'Catalogue de référence indisponible.');
        try {
            $catalogue = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            abort(503, 'Catalogue de référence invalide.');
        }
        abort_unless(is_array($catalogue) && ($catalogue['schema'] ?? null) === 'begpharma.canevas.v1'
            && is_array($catalogue['canevas'] ?? null) && array_is_list($catalogue['canevas'])
            && is_array($catalogue['non_integres'] ?? null), 503, 'Catalogue de référence invalide.');
        $ids = [];
        foreach ($catalogue['canevas'] as $entry) {
            abort_unless(is_array($entry), 503, 'Catalogue de référence invalide.');
            foreach (['id', 'titre', 'rubrique', 'fichier', 'sha256'] as $key) {
                abort_unless(isset($entry[$key]) && is_string($entry[$key]), 503, 'Catalogue de référence invalide.');
            }
            abort_unless(preg_match('/\A[a-f0-9]{24}\z/D', $entry['id']) === 1
                && preg_match('/\A[a-f0-9]{64}\z/D', $entry['sha256']) === 1
                && !isset($ids[$entry['id']]) && is_array($entry['parties'] ?? null)
                && is_array($entry['images'] ?? null), 503, 'Catalogue de référence invalide.');
            $ids[$entry['id']] = true;
        }
        return $catalogue;
    }
}

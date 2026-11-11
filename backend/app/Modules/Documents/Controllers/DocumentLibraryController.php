<?php
declare(strict_types=1);

namespace App\Modules\Documents\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final class DocumentLibraryController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $this->permission($request, 'documents.read');
        $tenant = (int) app('tenant.officine_id');
        $approvedSources = DB::table('document_sources')->where('officine_id', $tenant)->where('status', 'approved')->count();
        $approvedBpd = DB::table('document_sources')->where('officine_id', $tenant)->where('source_kind', 'bpd')->where('status', 'approved')->count();
        $approvedTemplates = DB::table('document_template_versions')->where('officine_id', $tenant)->where('status', 'approved')->count();
        // A reviewed source file is not a structured, approved rule set. This target has
        // no rule-level representation yet, so never announce the BPD module as available.
        return response()->json(['available' => false,
            'approved_sources' => $approvedSources, 'approved_bpd_sources' => $approvedBpd, 'approved_templates' => $approvedTemplates,
            'message' => 'Indisponible : le corpus et les règles BPD structurées n’ont pas encore de validation métier approuvée dans cette officine.']);
    }

    public function sources(Request $request): JsonResponse
    {
        $this->permission($request, 'documents.read');
        $tenant = (int) app('tenant.officine_id');
        $rows = DB::table('document_sources')->where('officine_id', $tenant)->latest()->paginate(25);
        return response()->json(['data' => $rows]);
    }

    public function downloadSource(Request $request, int $id): BinaryFileResponse
    {
        $this->permission($request, 'documents.read');
        $source = $this->source($id);
        abort_unless(Storage::disk('local')->exists($source->private_path), 404);
        $path = Storage::disk('local')->path($source->private_path);
        abort_unless(hash_equals($source->sha256, hash_file('sha256', $path)), 409, 'Empreinte de la source altérée.');
        return response()->download($path, $source->original_name, ['Content-Type' => 'application/octet-stream', 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store']);
    }

    public function import(Request $request): JsonResponse
    {
        $this->permission($request, 'documents.write');
        $data = $request->validate(['source_kind' => 'required|in:corpus,bpd', 'provenance' => 'required|string|min:8|max:500',
            'file' => 'required|file|max:20480|mimes:pdf,doc,docx,xls,xlsx,odt,ods,csv,txt,json']);
        $tenant = (int) app('tenant.officine_id');
        $file = $data['file'];
        $hash = hash_file('sha256', $file->getRealPath());
        $existing = DB::table('document_sources')->where('officine_id', $tenant)->where('source_kind', $data['source_kind'])->where('sha256', $hash)->first();
        if ($existing) return response()->json(['data' => $existing, 'created' => false]);

        $path = $tenant.'/quarantine/'.Str::uuid();
        Storage::disk('local')->put($path, fopen($file->getRealPath(), 'rb'));
        abort_unless(hash_equals($hash, hash_file('sha256', Storage::disk('local')->path($path))), 500, 'Vérification de la copie impossible.');
        try {
            $id = DB::table('document_sources')->insertGetId(['officine_id' => $tenant, 'source_kind' => $data['source_kind'],
                'original_name' => basename($file->getClientOriginalName()), 'private_path' => $path, 'mime' => $file->getMimeType(),
                'bytes' => $file->getSize(), 'sha256' => $hash, 'provenance' => $data['provenance'], 'status' => 'quarantine',
                'imported_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            $existing = DB::table('document_sources')->where('officine_id', $tenant)->where('source_kind', $data['source_kind'])->where('sha256', $hash)->first();
            if ($existing) return response()->json(['data' => $existing, 'created' => false]);
            throw $exception;
        }
        $this->auditSource($request, $id, 'imported');
        return response()->json(['data' => DB::table('document_sources')->where('id', $id)->first(), 'created' => true], 201);
    }

    public function qualify(Request $request, int $id): JsonResponse
    {
        $this->permission($request, 'documents.qualify');
        $data = $request->validate(['document_code' => 'required|string|max:80', 'document_kind' => 'required|in:procedure,mop,form,record,piece_source',
            'process' => 'nullable|string|max:80', 'qualification_note' => 'required|string|min:8|max:2000']);
        $row = $this->source($id);
        abort_unless($row->status === 'quarantine', 409, 'Seule une source en quarantaine peut être qualifiée.');
        DB::table('document_sources')->where('id', $id)->where('officine_id', app('tenant.officine_id'))->update($data + [
            'status' => 'qualified', 'qualified_by' => $request->user()->id, 'qualified_at' => now(), 'updated_at' => now()]);
        $this->auditSource($request, $id, 'qualified');
        return response()->json(['data' => $this->source($id)]);
    }

    public function approveSource(Request $request, int $id): JsonResponse
    {
        $this->permission($request, 'documents.approve');
        $data = $request->validate(['password' => 'required|string', 'sha256' => 'required|regex:/^[a-f0-9]{64}$/', 'confirmed' => 'required|accepted']);
        abort_unless(Hash::check($data['password'], $request->user()->password), 422, 'Confirmation du mot de passe invalide.');
        return DB::transaction(function () use ($request, $id, $data) {
            $row = DB::table('document_sources')->where('officine_id', app('tenant.officine_id'))->where('id', $id)->lockForUpdate()->first();
            abort_unless($row && $row->status === 'qualified' && $row->document_kind !== 'piece_source' && hash_equals($row->sha256, $data['sha256']), 409, 'Source non qualifiée ou empreinte/version modifiée.');
            DB::table('document_sources')->where('id', $id)->update(['status' => 'approved', 'approved_by' => $request->user()->id, 'approved_at' => now(), 'updated_at' => now()]);
            $this->auditSource($request, $id, 'approved');
            return response()->json(['data' => $this->source($id)]);
        });
    }

    public function templates(Request $request): JsonResponse
    {
        $this->permission($request, 'documents.read');
        return response()->json(['data' => DB::table('document_template_versions')->where('officine_id', app('tenant.officine_id'))->latest()->paginate(25)]);
    }

    public function createTemplate(Request $request): JsonResponse
    {
        $this->permission($request, 'documents.write');
        $data = $request->validate(['source_id' => 'required|integer', 'name' => 'required|string|max:255',
            'fields' => 'required|array|min:1|max:80', 'fields.*.key' => 'required|string|alpha_dash|max:80',
            'fields.*.label' => 'required|string|max:160', 'fields.*.type' => 'required|in:text,date,number,boolean']);
        $tenant = (int) app('tenant.officine_id');
        $source = DB::table('document_sources')->where('officine_id', $tenant)->where('id', $data['source_id'])->where('status', 'approved')->first();
        abort_unless($source, 409, 'Un canevas ne peut être créé qu’à partir d’une source approuvée de cette officine.');
        abort_if(DB::table('document_template_versions')->where('source_id', $source->id)->where('status', 'draft')->exists(), 409, 'Un brouillon de canevas existe déjà pour cette source.');
        $version = (int) DB::table('document_template_versions')->where('source_id', $source->id)->max('version') + 1;
        $fields = array_values($data['fields']);
        abort_if(count(array_unique(array_column($fields, 'key'))) !== count($fields), 422, 'Les clés de champs doivent être uniques.');
        $id = DB::table('document_template_versions')->insertGetId(['officine_id' => $tenant, 'source_id' => $source->id,
            'name' => $data['name'], 'version' => $version, 'fields' => json_encode($fields, JSON_THROW_ON_ERROR),
            'sha256' => hash('sha256', json_encode($fields, JSON_THROW_ON_ERROR)), 'status' => 'draft', 'created_by' => $request->user()->id,
            'created_at' => now(), 'updated_at' => now()]);
        return response()->json(['data' => DB::table('document_template_versions')->where('id', $id)->first()], 201);
    }

    public function approveTemplate(Request $request, int $id): JsonResponse
    {
        $this->permission($request, 'documents.approve');
        $data = $request->validate(['password' => 'required|string', 'sha256' => 'required|regex:/^[a-f0-9]{64}$/', 'confirmed' => 'required|accepted']);
        abort_unless(Hash::check($data['password'], $request->user()->password), 422, 'Confirmation du mot de passe invalide.');
        return DB::transaction(function () use ($request, $id, $data) {
            $template = DB::table('document_template_versions')->where('officine_id', app('tenant.officine_id'))->where('id', $id)->lockForUpdate()->first();
            abort_unless($template && $template->status === 'draft' && hash_equals($template->sha256, $data['sha256']), 409, 'Version de canevas obsolète.');
            $source = $this->source((int) $template->source_id);
            abort_unless($source->status === 'approved', 409, 'La source du canevas n’est plus approuvée.');
            DB::table('document_template_versions')->where('id', $id)->update(['status' => 'approved', 'approved_by' => $request->user()->id, 'approved_at' => now(), 'updated_at' => now()]);
            return response()->json(['data' => DB::table('document_template_versions')->where('id', $id)->first()]);
        });
    }

    public function instantiate(Request $request, int $id): JsonResponse
    {
        $this->permission($request, 'documents.write');
        $data = $request->validate(['values' => 'required|array']);
        $template = DB::table('document_template_versions')->where('officine_id', app('tenant.officine_id'))->where('id', $id)->where('status', 'approved')->first();
        abort_unless($template, 409, 'Seule une version de canevas approuvée est instanciable.');
        $fields = json_decode($template->fields, true, flags: JSON_THROW_ON_ERROR);
        $keys = array_column($fields, 'key');
        abort_if(array_diff(array_keys($data['values']), $keys) || array_diff($keys, array_keys($data['values'])), 422, 'Les valeurs doivent correspondre exactement aux champs du canevas.');
        $snapshot = ['template' => ['id' => $template->id, 'version' => $template->version, 'sha256' => $template->sha256, 'name' => $template->name], 'values' => $data['values']];
        $content = json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        $document = DB::table('documents')->insertGetId(['officine_id' => app('tenant.officine_id'), 'title' => $template->name,
            'kind' => 'record', 'process' => $this->source((int) $template->source_id)->process, 'status' => 'draft', 'version' => 1,
            'content' => $content, 'sha256' => hash('sha256', $content), 'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
        return response()->json(['data' => DB::table('documents')->where('id', $document)->first()], 201);
    }

    public function followups(Request $request, string $category): JsonResponse
    {
        $this->permission($request, 'documents.read');
        abort_unless(in_array($category, ['formations', 'maintenance'], true), 404);
        $rows = DB::table('document_followups')->where('officine_id', app('tenant.officine_id'))->where('category', $category)->orderByDesc('id')->paginate(25);
        return response()->json(['data' => $rows]);
    }

    public function createFollowup(Request $request, string $category): JsonResponse
    {
        $this->permission($request, 'documents.write');
        abort_unless(in_array($category, ['formations', 'maintenance'], true), 404);
        $data = $request->validate(['status' => 'required|in:planned,cancelled', 'data' => 'required|array', 'data.theme' => 'required_if:category,formations|string|max:255',
            'data.responsable_suivi' => 'required|string|max:255']);
        $payload = $data['data'];
        $allowed = $category === 'formations' ? ['theme','public_vise','date_debut_prevue','date_fin_prevue','responsable_suivi','motif_annulation'] : ['equipement','nature','description','date_prevue','responsable_suivi','motif_annulation'];
        abort_if(array_diff(array_keys($payload), $allowed), 422, 'Champ non défini par le suivi documentaire.');
        if ($data['status'] === 'cancelled') abort_unless(!empty($payload['motif_annulation']), 422, 'Un motif est requis pour annuler.');
        $id = DB::table('document_followups')->insertGetId(['officine_id' => app('tenant.officine_id'), 'category' => $category === 'formations' ? 'formation' : 'maintenance',
            'status' => $data['status'], 'version' => 1, 'data' => json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
            'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
        $this->followupEvent($request, $id, 1, $data);
        return response()->json(['data' => DB::table('document_followups')->where('id', $id)->first()], 201);
    }

    public function updateFollowup(Request $request, int $id): JsonResponse
    {
        $this->permission($request, 'documents.write');
        $data = $request->validate(['version' => 'required|integer|min:1', 'status' => 'required|in:planned,completed,cancelled',
            'data' => 'required|array', 'reason' => 'required|string|min:8|max:500']);
        return DB::transaction(function () use ($request, $id, $data) {
            $row = DB::table('document_followups')->where('officine_id', app('tenant.officine_id'))->where('id', $id)->lockForUpdate()->first();
            abort_unless($row, 404);
            abort_unless($row->version === $data['version'], 409, 'Le suivi a été modifié. Rechargez sa dernière version.');
            abort_unless($row->status === 'planned', 409, 'Un suivi finalisé ou annulé est immuable.');
            $next = $row->version + 1;
            DB::table('document_followups')->where('id', $id)->update(['status' => $data['status'], 'data' => json_encode($data['data'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), 'version' => $next, 'updated_at' => now()]);
            $this->followupEvent($request, $id, $next, $data);
            return response()->json(['data' => DB::table('document_followups')->where('id', $id)->first()]);
        });
    }

    private function source(int $id): object
    {
        return DB::table('document_sources')->where('officine_id', app('tenant.officine_id'))->where('id', $id)->first() ?? abort(404);
    }

    private function permission(Request $request, string $permission): void
    {
        $permissions = (array) $request->attributes->get('officine.permissions', []);
        abort_unless(in_array($permission, $permissions, true) || (bool) $request->attributes->get('officine.is_admin', false), 403, 'Permission documentaire requise.');
    }

    private function auditSource(Request $request, int $id, string $action): void
    {
        DB::table('document_source_events')->insert(['officine_id' => app('tenant.officine_id'), 'source_id' => $id, 'actor_id' => $request->user()->id,
            'action' => $action, 'created_at' => now()]);
    }

    private function followupEvent(Request $request, int $id, int $version, array $snapshot): void
    {
        DB::table('document_followup_events')->insert(['officine_id' => app('tenant.officine_id'), 'followup_id' => $id, 'actor_id' => $request->user()->id,
            'version' => $version, 'snapshot' => json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), 'created_at' => now()]);
    }
}

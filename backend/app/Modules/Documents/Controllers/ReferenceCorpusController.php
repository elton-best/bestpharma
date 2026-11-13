<?php
declare(strict_types=1);

namespace App\Modules\Documents\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Documents\Services\ReferenceCorpusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final class ReferenceCorpusController extends Controller
{
    public function __construct(private readonly ReferenceCorpusService $corpus) {}

    public function index(Request $request): JsonResponse
    {
        $this->permission($request, 'documents.read');
        $filters = $request->validate(['rubrique' => 'sometimes|nullable|string|max:255', 'search' => 'sometimes|nullable|string|max:255']);
        return response()->json($this->corpus->catalogue($filters['rubrique'] ?? null, $filters['search'] ?? null))
            ->header('Cache-Control', 'private, no-store')->header('X-Content-Type-Options', 'nosniff');
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $this->permission($request);
        return response()->json(['data' => $this->corpus->detail($id)])
            ->header('Cache-Control', 'private, no-store')->header('X-Content-Type-Options', 'nosniff');
    }

    public function download(Request $request, string $id): BinaryFileResponse
    {
        $this->permission($request);
        $source = $this->corpus->verifiedSource($id);
        return response()->download($source['path'], $source['name'], [
            'Content-Type' => 'application/octet-stream', 'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store', 'X-Reference-SHA256' => $source['sha256'],
        ]);
    }

    public function import(Request $request, string $id): JsonResponse
    {
        $this->permission($request, 'documents.manage');
        $this->permission($request, 'documents.write');
        $result = $this->corpus->importSource($id, (int) app('tenant.officine_id'), (int) $request->user()->id);
        return response()->json($result, $result['created'] ? 201 : 200)
            ->header('Cache-Control', 'private, no-store')->header('X-Content-Type-Options', 'nosniff');
    }

    private function permission(Request $request, string $permission = 'documents.manage'): void
    {
        abort_unless($request->user(), 401);
        // Membership and active module must be resolved by the normal Documents middleware.
        abort_unless(app()->bound('tenant.officine_id') && (int) app('tenant.officine_id') > 0, 403, 'Contexte officine requis.');
        $permissions = (array) $request->attributes->get('officine.permissions', []);
        abort_unless(in_array($permission, $permissions, true)
            || (bool) $request->attributes->get('officine.is_admin', false), 403, 'Permission documentaire requise.');
    }
}

<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CatalogueCanevasService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CanevasController extends Controller
{
    public function index(Request $request, string $officineId): JsonResponse
    {
        $this->autoriser($request, $officineId);
        return response()->json(array_map(fn ($c) => array_intersect_key($c, array_flip(['id', 'titre', 'rubrique', 'fichier', 'sha256', 'usage', 'format'])), app(CatalogueCanevasService::class)->tous()));
    }

    public function show(Request $request, string $officineId, string $id): JsonResponse
    {
        $this->autoriser($request, $officineId);
        return response()->json(app(CatalogueCanevasService::class)->trouver($id));
    }

    public function store(Request $request, string $officineId, string $id): JsonResponse
    {
        $this->autoriser($request, $officineId, true);
        $service = app(CatalogueCanevasService::class);
        $canevas = $service->trouver($id);
        abort_if(($canevas['usage'] ?? null) === 'reference', 422, 'Ce document annoté est une référence à consulter, pas un formulaire à remplir.');
        $cles = $service->champs($canevas);
        $v = $request->validate(['valeurs' => 'present|array', 'valeurs.*' => 'nullable|string|max:30000', 'type_doc' => 'required|in:procedure,enregistrement,fiche_poste', 'processus' => 'required|in:TAM,QAM,GAD,GAC,GAR']);
        abort_if(array_diff(array_keys($v['valeurs']), $cles), 422, 'Une zone de saisie ne correspond pas au canevas.');
        // Copie structurée du modèle dans le document : les évolutions du catalogue
        // ne modifient jamais les brouillons et approbations déjà enregistrés.
        $contenu = json_encode(['schema' => 'begpharma.canevas-rempli.v1', 'canevas' => $canevas, 'valeurs' => $v['valeurs']], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        $creation = Request::create($request->path(), 'POST', ['titre' => mb_substr($canevas['titre'], 0, 255),
            'type_doc' => $v['type_doc'], 'processus' => $v['processus'], 'contenu' => $contenu,
            'code_document' => 'CAN-'.strtoupper(Str::random(16))]);
        $creation->setUserResolver(fn () => $request->user());
        return app(DocumentController::class)->store($creation, $officineId);
    }

    private function autoriser(Request $request, string $officineId, bool $ecrire = false): void
    {
        abort_unless(Str::isUuid($officineId), 404);
        abort_unless($request->user() && $request->user()->actif && !$request->user()->archived, 403);
        $role = DB::table('utilisateurs_officines')->where('officine_id', $officineId)->where('user_id', $request->user()->id)
            ->where('actif', true)->where('archived', false)->value('role_code');
        abort_unless($role, 403);
        if ($ecrire) abort_unless(in_array($role, ['promoteur', 'pharmacien_titulaire', 'pharmacien_adjoint', 'rmq']), 403);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class FichierDocumentController extends Controller
{
    private const COLONNES = ['id', 'document_id', 'version_document', 'indice_revision', 'numero',
        'nom_original', 'mime', 'octets', 'sha256', 'depose_le', 'conserver_jusqu_au'];

    public function index(Request $request, string $officineId, string $id): JsonResponse
    {
        $this->autoriser($request, $officineId, $id);
        return response()->json(DB::table('fichiers_documents')->where('officine_id', $officineId)
            ->where('document_id', $id)->orderByDesc('numero')->get(self::COLONNES));
    }

    public function store(Request $request, string $officineId, string $id): JsonResponse
    {
        $this->autoriser($request, $officineId, $id);
        $request->validate([
            'file' => 'required|file|max:30720|mimes:pdf,doc,docx,xls,xlsx,odt,jpg,jpeg,png|extensions:pdf,doc,docx,xls,xlsx,odt,jpg,jpeg,png',
            'version_document' => 'required|integer|min:1',
            'indice_revision' => 'required|integer|min:0',
        ]);
        $chemin = null;
        try {
            return DB::transaction(function () use ($request, $officineId, $id, &$chemin) {
                $doc = DB::table('documents')->where('officine_id', $officineId)->where('id', $id)
                    ->where('archived', false)->lockForUpdate()->first();
                abort_unless($doc, 404);
                abort_unless(in_array($doc->statut, ['brouillon', 'a_valider'], true), 409,
                    'Ouvrez une nouvelle révision avant d’ajouter un fichier à un document approuvé.');
                abort_unless((int) $doc->version === (int) $request->input('version_document')
                    && (int) $doc->indice_revision === (int) $request->input('indice_revision'), 409,
                    'La version documentaire a changé. Rechargez la fiche.');
                $file = $request->file('file');
                $hash = hash_file('sha256', $file->getRealPath());
                $exist = DB::table('fichiers_documents')->where('officine_id', $officineId)->where('document_id', $id)
                    ->where('version_document', $doc->version)->where('indice_revision', $doc->indice_revision)
                    ->where('sha256', $hash)->first(self::COLONNES);
                if ($exist) return response()->json($exist, 200);
                abort_if(DB::table('fichiers_documents')->where('document_id', $id)->count() >= 1000, 422,
                    'Le nombre maximal de fichiers conservés pour cette fiche est atteint.');
                $uuid = (string) Str::uuid();
                $nom = basename(str_replace('\\', '/', $file->getClientOriginalName()));
                $nom = mb_substr(preg_replace('/[\x00-\x1F\x7F]/u', '', $nom), 0, 200);
                $chemin = "{$officineId}/{$id}/{$uuid}";
                $flux = fopen($file->getRealPath(), 'rb');
                try {
                    if (!Storage::disk('ged')->put($chemin, $flux)) throw new \RuntimeException('Écriture du fichier privé impossible.');
                }
                finally { if (is_resource($flux)) fclose($flux); }
                DB::table('fichiers_documents')->insert([
                    'id' => $uuid, 'officine_id' => $officineId, 'document_id' => $id,
                    'version_document' => $doc->version, 'indice_revision' => $doc->indice_revision,
                    'numero' => (DB::table('fichiers_documents')->where('document_id', $id)->max('numero') ?? 0) + 1,
                    'nom_original' => $nom ?: 'document', 'mime' => $file->getMimeType(),
                    'octets' => $file->getSize(), 'sha256' => $hash, 'chemin' => $chemin,
                    'depose_par' => $request->user()->id, 'depose_le' => now(),
                    'conserver_jusqu_au' => now()->addYears(10)->toDateString(),
                ]);
                return response()->json(DB::table('fichiers_documents')->where('id', $uuid)->first(self::COLONNES), 201);
            });
        } catch (\Throwable $e) {
            if ($chemin !== null) Storage::disk('ged')->delete($chemin);
            throw $e;
        }
    }

    public function telecharger(Request $request, string $officineId, string $id, string $fichierId): BinaryFileResponse
    {
        $this->autoriser($request, $officineId, $id);
        abort_unless(Str::isUuid($fichierId), 404);
        $file = DB::table('fichiers_documents')->where('officine_id', $officineId)->where('document_id', $id)
            ->where('id', $fichierId)->first();
        abort_unless($file && Storage::disk('ged')->exists($file->chemin), 404, 'Fichier conservé introuvable.');
        $path = Storage::disk('ged')->path($file->chemin);
        abort_unless(hash_equals($file->sha256, hash_file('sha256', $path)), 409,
            'L’empreinte du fichier ne correspond plus. Téléchargement bloqué.');
        return response()->download($path, $file->nom_original, [
            'Content-Type' => 'application/octet-stream', 'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    private function autoriser(Request $request, string $officineId, string $id): void
    {
        abort_unless(Str::isUuid($officineId) && Str::isUuid($id), 404);
        abort_unless($request->user() && $request->user()->actif && !$request->user()->archived, 403);
        abort_unless(DB::table('utilisateurs_officines')->where('officine_id', $officineId)
            ->where('user_id', $request->user()->id)->where('actif', true)->where('archived', false)->exists(), 403);
        abort_unless(DB::table('documents')->where('officine_id', $officineId)->where('id', $id)->exists(), 404);
    }
}

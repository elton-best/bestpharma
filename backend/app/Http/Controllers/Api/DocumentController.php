<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use App\Services\EmpreinteDocumentService;
use App\Services\FichiersDocumentService;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DocumentController extends Controller
{
    public function index(Request $request, string $officineId): JsonResponse
    {
        $this->autoriser($request, $officineId);
        $query = DB::table('documents')
            ->where('officine_id', $officineId)
            ->where('archived', false);

        if ($request->filled('statut') && $request->statut !== 'tous') {
            $query->where('statut', $request->statut);
        }

        if ($request->filled('processus')) {
            $query->where('processus', $request->processus);
        }

        $docs = $query->orderByDesc('updated_at')->get()->map(fn ($doc) => $this->avecEmpreinte($doc));
        return response()->json($docs);
    }

    public function store(Request $request, string $officineId): JsonResponse
    {
        $this->autoriser($request, $officineId);
        $validated = $request->validate([
            'titre' => 'required|string|max:255',
            'type_doc' => 'nullable|string|max:20',
            'processus' => 'nullable|string|max:20',
            'contenu' => 'nullable|string',
            'code_document' => 'nullable|string|max:50',
        ]);

        $user = $request->user();
        $docId = (string) Str::uuid();

        $codeDoc = $validated['code_document'] ?? (
            ($validated['processus'] ?? 'QAM') . '-' .
            strtoupper($validated['type_doc'] ?? 'PR') . '-' .
            str_pad((string) (DB::table('documents')->where('officine_id', $officineId)->count() + 1), 3, '0', STR_PAD_LEFT)
        );

        DB::table('documents')->insert([
            'id' => $docId,
            'officine_id' => $officineId,
            'titre' => $validated['titre'],
            'type_doc' => $validated['type_doc'] ?? 'procedure',
            'processus' => $validated['processus'] ?? 'QAM',
            'code_document' => $codeDoc,
            'categorie' => $validated['type_doc'] ?? 'procedure',
            'contenu' => $validated['contenu'] ?? '',
            'version' => 1,
            'indice_revision' => 0,
            'statut' => 'brouillon',
            'modele' => false,
            'redacteur_nom' => $user ? $user->name : 'Utilisateur',
            'created_by' => $user?->id,
            'archived' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $created = DB::table('documents')->where('id', $docId)->first();
        return response()->json($this->avecEmpreinte($created), 201);
    }

    public function show(Request $request, string $officineId, string $id): JsonResponse
    {
        $this->autoriser($request, $officineId);
        $doc = DB::table('documents')
            ->where('officine_id', $officineId)
            ->where('id', $id)
            ->where('archived', false)
            ->first();

        if (! $doc) {
            return response()->json(['message' => 'Document introuvable'], 404);
        }

        return response()->json($this->avecEmpreinte($doc));
    }

    public function update(Request $request, string $officineId, string $id): JsonResponse
    {
        $role = $this->autoriser($request, $officineId);
        $valider = $request->input('statut') === 'valide';
        if ($valider) {
            abort_unless(in_array($role, ['promoteur', 'pharmacien_titulaire'], true), 403,
                'Approbation réservée au titulaire ou au promoteur habilité.');
        }
        $validated = $request->validate([
            'titre' => 'sometimes|required|string|max:255',
            'code_document' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('documents', 'code_document')->where('officine_id', $officineId)->ignore($id)],
            'contenu' => 'sometimes|nullable|string',
            'type_doc' => 'sometimes|string|max:20',
            'processus' => 'sometimes|string|max:20',
            'statut' => 'sometimes|in:brouillon,a_valider,valide,retire',
            'motif_refus' => 'sometimes|nullable|string',
            'empreinte_edition' => 'sometimes|required|regex:/^[a-f0-9]{64}$/',
            'password' => $valider ? 'required|string|max:1024' : 'prohibited',
            'empreinte_attendue' => $valider ? 'required|regex:/^[a-f0-9]{64}$/' : 'prohibited',
            'intention' => $valider ? 'required|in:approbation_documentaire' : 'prohibited',
        ]);
        if ($valider) {
            $cle = 'approbation-document:'.$request->user()->id;
            abort_if(RateLimiter::tooManyAttempts($cle, 5), 429,
                'Trop de tentatives. Veuillez réessayer plus tard.');
            RateLimiter::hit($cle, 300);
            abort_unless(Hash::check($validated['password'], $request->user()->password), 422,
                'La confirmation du mot de passe a échoué.');
            RateLimiter::clear($cle);
        }
        return DB::transaction(function () use ($request, $officineId, $id, $role, $validated, $valider) {
            $doc = DB::table('documents')->where('officine_id', $officineId)->where('id', $id)
                ->where('archived', false)->lockForUpdate()->first();
            abort_unless($doc, 404, 'Document introuvable.');
            $structure = json_decode($doc->contenu ?? '', true);
            if (is_array($structure) && ($structure['schema'] ?? null) === 'begpharma.canevas-rempli.v1') {
                abort_unless(in_array($role, ['promoteur', 'pharmacien_titulaire', 'pharmacien_adjoint', 'rmq']), 403);
                if (array_key_exists('contenu', $validated)) {
                    abort_unless(isset($validated['empreinte_edition']), 422, 'Rechargez le canevas avant de le modifier.');
                    $nouvelle = json_decode($validated['contenu'] ?? '', true);
                    abort_unless(is_array($nouvelle) && ($nouvelle['schema'] ?? null) === $structure['schema']
                        && ($nouvelle['canevas'] ?? null) === $structure['canevas'] && is_array($nouvelle['valeurs'] ?? null), 422,
                        'La structure source du canevas ne peut pas être remplacée.');
                    $cles = app(\App\Services\CatalogueCanevasService::class)->champs($structure['canevas']);
                    abort_if(array_diff(array_keys($nouvelle['valeurs']), $cles), 422, 'Zone de saisie inconnue.');
                    foreach ($nouvelle['valeurs'] as $texte) abort_unless(is_string($texte) && mb_strlen($texte) <= 30000, 422, 'Zone de saisie invalide.');
                    $nouvelle['valeurs'] = app(\App\Services\CalculsCanevasService::class)->recalculer($structure['canevas'], $nouvelle['valeurs']);
                    $validated['contenu'] = json_encode($nouvelle, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
                }
            }

            $fields = array_intersect_key($validated, array_flip([
                'titre', 'contenu', 'type_doc', 'processus', 'statut', 'motif_refus', 'code_document',
            ]));
            $doc->fichiers = app(FichiersDocumentService::class)->manifeste($doc);
            $empreintes = app(EmpreinteDocumentService::class);
            if (isset($validated['empreinte_edition'])) {
                abort_unless(hash_equals($empreintes->empreinte($doc), $validated['empreinte_edition']), 409,
                    'Ce document a changé. Rechargez-le avant de reprendre les modifications.');
            }

            if ($doc->type_doc === 'piece_source' && (isset($fields['code_document']) || isset($fields['type_doc']))) {
                abort_unless(in_array($role, ['promoteur', 'pharmacien_titulaire', 'rmq'], true), 403, 'Qualification documentaire réservée aux responsables habilités.');
            }
            if ($valider) {
                abort_if($doc->type_doc === 'piece_source' || str_starts_with($doc->code_document ?? '', 'SRC-'), 409,
                    'Qualifiez le code, le type et le processus du document source avant de demander l’approbation.');
                abort_if($doc->statut === 'valide' || $doc->statut === 'retire', 409,
                    'Ce document ne peut pas être approuvé dans son état actuel.');
                // L’approbation porte sur ce qui a été consulté, jamais sur des modifications jointes.
                abort_if(count(array_diff(array_keys($fields), ['statut'])) > 0, 422,
                    'Enregistrez les modifications avant de demander l’approbation.');
                abort_unless(hash_equals($empreintes->empreinte($doc), $validated['empreinte_attendue']), 409,
                    'Le document a changé. Rechargez-le avant de confirmer.');
                $date = now();
                DB::table('approbations_documents')->insert([
                    'id' => (string) Str::uuid(), 'officine_id' => $officineId, 'document_id' => $id,
                    'version' => $doc->version, 'indice_revision' => $doc->indice_revision,
                    'signataire_id' => $request->user()->id, 'signataire_nom' => $request->user()->name,
                    'role_code' => $role, 'methode' => 'mot_de_passe_compte',
                    'intention' => 'approbation_documentaire',
                    'contenu_signe' => $empreintes->contenuSigne($doc),
                    'empreinte_contenu' => $empreintes->empreinte($doc), 'approuve_le' => $date,
                ]);
                $fields += ['approbateur_nom' => $request->user()->name, 'approuve_le' => $date,
                    'valide_le' => $date, 'valide_par' => $request->user()->id];
            }
            if (in_array($doc->statut, ['valide', 'retire'], true)) {
                abort_unless(in_array($role, ['promoteur', 'pharmacien_titulaire', 'rmq'], true), 403, 'Révision réservée aux responsables habilités.');
                abort_unless(($fields['statut'] ?? null) === 'brouillon' && count($fields) === 1, 409,
                    'Un document approuvé ne se modifie pas directement. Ouvrez une nouvelle révision.');
                $fields += ['version' => $doc->version + 1, 'indice_revision' => $doc->indice_revision + 1,
                    'redacteur_nom' => $request->user()->name, 'approbateur_nom' => null,
                    'approuve_le' => null, 'valide_le' => null, 'valide_par' => null];
            }
            $fields['updated_at'] = now();
            DB::table('documents')->where('officine_id', $officineId)->where('id', $id)->update($fields);
            return response()->json($this->avecEmpreinte(DB::table('documents')->where('id', $id)->first()));
        });
    }

    public function approbations(Request $request, string $officineId, string $id): JsonResponse
    {
        $this->autoriser($request, $officineId);
        abort_unless(DB::table('documents')->where('officine_id', $officineId)->where('id', $id)->exists(), 404);
        $lignes = DB::table('approbations_documents')->where('officine_id', $officineId)
            ->where('document_id', $id)->orderByDesc('approuve_le')->get();
        return response()->json($lignes->map(function ($ligne) {
            $ligne->empreinte_verifiee = hash_equals($ligne->empreinte_contenu, hash('sha256', $ligne->contenu_signe));
            return $ligne;
        }));
    }

    public function importsCorpus(Request $request, string $officineId): JsonResponse
    {
        $this->autoriser($request, $officineId);
        $imports = DB::table('imports_corpus')->where('officine_id', $officineId)
            ->orderByDesc('importe_le')->get(['id', 'manifeste_sha256', 'bilan', 'importe_le']);
        return response()->json($imports->map(function ($import) {
            $import->bilan = json_decode($import->bilan, true, 512, JSON_THROW_ON_ERROR);
            return $import;
        }));
    }

    private function avecEmpreinte(object $doc): object
    {
        $doc->fichiers = app(FichiersDocumentService::class)->manifeste($doc);
        $doc->empreinte_contenu = app(EmpreinteDocumentService::class)->empreinte($doc);
        return $doc;
    }

    private function autoriser(Request $request, string $officineId): string
    {
        abort_unless($request->user() && $request->user()->actif && !$request->user()->archived, 403);
        $role = DB::table('utilisateurs_officines')->where('officine_id', $officineId)
            ->where('user_id', $request->user()->id)->where('actif', true)->where('archived', false)
            ->value('role_code');
        abort_unless($role, 403, 'Accès non autorisé à cette officine.');
        return $role;
    }
}

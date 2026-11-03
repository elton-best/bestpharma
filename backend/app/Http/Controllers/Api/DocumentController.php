<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    public function index(Request $request, string $officineId): JsonResponse
    {
        $query = DB::table('documents')
            ->where('officine_id', $officineId)
            ->where('archived', false);

        if ($request->filled('statut') && $request->statut !== 'tous') {
            $query->where('statut', $request->statut);
        }

        if ($request->filled('processus')) {
            $query->where('processus', $request->processus);
        }

        $docs = $query->orderByDesc('updated_at')->get();
        return response()->json($docs);
    }

    public function store(Request $request, string $officineId): JsonResponse
    {
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
        return response()->json($created, 201);
    }

    public function show(string $officineId, string $id): JsonResponse
    {
        $doc = DB::table('documents')
            ->where('officine_id', $officineId)
            ->where('id', $id)
            ->where('archived', false)
            ->first();

        if (! $doc) {
            return response()->json(['message' => 'Document introuvable'], 404);
        }

        return response()->json($doc);
    }

    public function update(Request $request, string $officineId, string $id): JsonResponse
    {
        $doc = DB::table('documents')
            ->where('officine_id', $officineId)
            ->where('id', $id)
            ->where('archived', false)
            ->first();

        if (! $doc) {
            return response()->json(['message' => 'Document introuvable'], 404);
        }

        $user = $request->user();
        $fields = $request->only([
            'titre', 'contenu', 'type_doc', 'processus', 'statut', 'motif_refus'
        ]);

        // Si le statut passe à "valide", seul le pharmacien titulaire ou le promoteur peut valider (art. 3 BPD)
        if (isset($fields['statut']) && $fields['statut'] === 'valide') {
            $userRole = DB::table('utilisateurs_officines')
                ->where('officine_id', $officineId)
                ->where('user_id', $user->id)
                ->first();

            $role = $userRole?->role_code;

            if (! in_array($role, ['promoteur', 'pharmacien_titulaire'])) {
                return response()->json([
                    'message' => 'Seul le Pharmacien Titulaire ou le Promoteur peut approuver et valider un document officiel (art. 3 des BPD). Rôle détecté: ' . ($role ?? 'aucun'),
                ], 403);
            }

            $fields['approbateur_nom'] = $user->name;
            $fields['approuve_le'] = now();
            $fields['valide_le'] = now();
            $fields['valide_par'] = $user->id;
        }

        // Si on crée une nouvelle révision
        if (isset($fields['statut']) && $fields['statut'] === 'brouillon' && $doc->statut === 'valide') {
            $fields['version'] = $doc->version + 1;
            $fields['indice_revision'] = $doc->indice_revision + 1;
            $fields['redacteur_nom'] = $user->name;
            $fields['approbateur_nom'] = null;
            $fields['approuve_le'] = null;
            $fields['valide_le'] = null;
        }

        $fields['updated_at'] = now();
        DB::table('documents')->where('id', $id)->update($fields);

        $updated = DB::table('documents')->where('id', $id)->first();
        return response()->json($updated);
    }
}

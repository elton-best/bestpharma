<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ModeleBpdController extends Controller
{
    /**
     * Bibliothèque des 59 modèles types BPD de l'ABMed
     */
    public function index(Request $request): JsonResponse
    {
        $query = DB::table('modeles_bpd');

        if ($request->filled('processus')) {
            $query->where('processus', $request->processus);
        }

        if ($request->filled('type_document')) {
            $query->where('type_document', $request->type_document);
        }

        $modeles = $query->orderBy('code_ref')->get();
        return response()->json($modeles);
    }

    /**
     * Instanciation d'un modèle type dans les documents officiels d'une officine
     */
    public function instancier(Request $request, string $officineId, string $modeleId): JsonResponse
    {
        $modele = DB::table('modeles_bpd')->where('id', $modeleId)->first();
        if (! $modele) {
            return response()->json(['message' => 'Modèle introuvable'], 404);
        }

        $user = $request->user();
        $id = (string) Str::uuid();

        DB::table('documents')->insert([
            'id' => $id,
            'officine_id' => $officineId,
            'titre' => $modele->titre,
            'categorie' => $modele->type_document,
            'type_doc' => $modele->type_document,
            'processus' => $modele->processus,
            'code_document' => $modele->code_ref,
            'contenu' => $modele->contenu_modele,
            'version' => 1,
            'indice_revision' => 0,
            'statut' => 'brouillon',
            'modele' => false,
            'modele_source_id' => $modele->id,
            'redacteur_nom' => $user ? $user->name : 'Utilisateur',
            'created_by' => $user?->id,
            'archived' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $created = DB::table('documents')->where('id', $id)->first();
        return response()->json([
            'message' => 'Modèle BPD instancié en brouillon avec succès.',
            'document' => $created,
        ], 201);
    }
}

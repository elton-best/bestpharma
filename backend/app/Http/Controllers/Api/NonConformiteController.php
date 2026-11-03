<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class NonConformiteController extends Controller
{
    public function index(Request $request, string $officineId): JsonResponse
    {
        $ncs = DB::table('non_conformites')
            ->where('officine_id', $officineId)
            ->where('archived', false)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($ncs);
    }

    public function store(Request $request, string $officineId): JsonResponse
    {
        $validated = $request->validate([
            'titre' => 'required|string|max:255',
            'description' => 'nullable|string',
            'gravite' => 'required|in:mineure,majeure,critique',
            'processus' => 'nullable|string|max:20',
            'source' => 'nullable|string|max:50',
            'action_immediate' => 'nullable|string',
            'action_preventive' => 'nullable|string',
            'analyse_causes_5m' => 'nullable|string',
            'date_echeance_capa' => 'nullable|date',
            'responsable_action' => 'nullable|string|max:255',
        ]);

        $id = (string) Str::uuid();
        $count = DB::table('non_conformites')->where('officine_id', $officineId)->count() + 1;
        $numNc = 'NC-' . date('Y') . '-' . str_pad((string) $count, 3, '0', STR_PAD_LEFT);

        DB::table('non_conformites')->insert([
            'id' => $id,
            'officine_id' => $officineId,
            'numero_nc' => $numNc,
            'titre' => $validated['titre'],
            'description' => $validated['description'] ?? null,
            'gravite' => $validated['gravite'],
            'statut' => 'ouverte',
            'processus' => $validated['processus'] ?? 'QAM',
            'source' => $validated['source'] ?? 'interne',
            'action_immediate' => $validated['action_immediate'] ?? null,
            'action_preventive' => $validated['action_preventive'] ?? null,
            'analyse_causes_5m' => $validated['analyse_causes_5m'] ?? null,
            'date_echeance_capa' => $validated['date_echeance_capa'] ?? null,
            'responsable_action' => $validated['responsable_action'] ?? null,
            'archived' => false,
            'created_by' => $request->user()?->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $created = DB::table('non_conformites')->where('id', $id)->first();
        return response()->json($created, 201);
    }

    public function update(Request $request, string $officineId, string $id): JsonResponse
    {
        $nc = DB::table('non_conformites')
            ->where('officine_id', $officineId)
            ->where('id', $id)
            ->first();

        if (! $nc) {
            return response()->json(['message' => 'Non-conformité introuvable'], 404);
        }

        $fields = $request->only([
            'statut', 'action_immediate', 'action_preventive', 'analyse_causes_5m',
            'date_echeance_capa', 'responsable_action', 'efficacite_verifiee', 'conclusion_efficacite'
        ]);

        if (isset($fields['statut']) && $fields['statut'] === 'cloturee') {
            $user = $request->user();
            $fields['cloturee_le'] = now();
            $fields['cloturee_par'] = $user?->id;
        }

        $fields['updated_at'] = now();

        DB::table('non_conformites')
            ->where('officine_id', $officineId)
            ->where('id', $id)
            ->update($fields);

        $updated = DB::table('non_conformites')->where('id', $id)->first();
        return response()->json($updated);
    }
}

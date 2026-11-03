<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EmployeController extends Controller
{
    public function index(Request $request, string $officineId): JsonResponse
    {
        $employes = DB::table('employes')
            ->where('officine_id', $officineId)
            ->where('archived', false)
            ->orderBy('nom_complet')
            ->get();

        // Récupération des inscriptions à l'Ordre pour les pharmaciens
        $ordres = DB::table('inscriptions_ordre')
            ->where('officine_id', $officineId)
            ->get()
            ->keyBy('user_id');

        return response()->json([
            'employes' => $employes,
            'inscriptions_ordre' => $ordres,
        ]);
    }

    public function store(Request $request, string $officineId): JsonResponse
    {
        $validated = $request->validate([
            'nom_complet' => 'required|string|max:255',
            'poste' => 'required|string|max:50',
            'telephone' => 'nullable|string|max:50',
            'date_embauche' => 'nullable|date',
            'pin_code' => 'nullable|string|max:10',
            'date_visite_medicale' => 'nullable|date',
        ]);

        $id = (string) Str::uuid();
        $codeBadge = 'BDG-' . strtoupper(Str::random(6));
        $matricule = 'EMP-' . strtoupper(substr($validated['poste'], 0, 3)) . '-' . rand(10, 99);

        DB::table('employes')->insert([
            'id' => $id,
            'officine_id' => $officineId,
            'nom_complet' => $validated['nom_complet'],
            'poste' => $validated['poste'],
            'telephone' => $validated['telephone'] ?? null,
            'date_embauche' => $validated['date_embauche'] ?? now()->toDateString(),
            'matricule' => $matricule,
            'code_badge' => $codeBadge,
            'pin_code' => $validated['pin_code'] ?? '1234',
            'date_visite_medicale' => $validated['date_visite_medicale'] ?? null,
            'charte_qualite_signee' => true,
            'charte_signee_le' => now(),
            'actif' => true,
            'archived' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $created = DB::table('employes')->where('id', $id)->first();
        return response()->json($created, 201);
    }

    public function update(Request $request, string $officineId, string $id): JsonResponse
    {
        $fields = $request->only(['nom_complet', 'poste', 'telephone', 'date_visite_medicale', 'actif', 'pin_code']);
        $fields['updated_at'] = now();

        DB::table('employes')
            ->where('officine_id', $officineId)
            ->where('id', $id)
            ->update($fields);

        $updated = DB::table('employes')->where('id', $id)->first();
        return response()->json($updated);
    }
}

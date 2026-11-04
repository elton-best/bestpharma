<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Emplacement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmplacementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $officineId = $request->user()->officine_id;
        $emplacements = Emplacement::where('officine_id', $officineId)
            ->where('actif', true)
            ->withCount('lots')
            ->orderBy('code')
            ->get();

        return response()->json(['status' => 'success', 'data' => $emplacements]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:30',
            'libelle' => 'required|string|max:100',
            'type_zone' => 'required|in:comptoir,reserve,frigo,armoire_securisee,attente_controle,retours,dechets',
            'accepte_thermolabile' => 'boolean',
            'accepte_stupefiant' => 'boolean',
            'accepte_liste' => 'boolean',
            'capacite' => 'nullable|integer|min:0',
        ]);

        $officineId = $request->user()->officine_id;
        $validated['officine_id'] = $officineId;

        $emplacement = Emplacement::create($validated);

        return response()->json(['status' => 'success', 'message' => 'Emplacement créé', 'data' => $emplacement], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $officineId = $request->user()->officine_id;
        $emp = Emplacement::where('officine_id', $officineId)->with('lots.produit')->findOrFail($id);
        return response()->json(['status' => 'success', 'data' => $emp]);
    }
}

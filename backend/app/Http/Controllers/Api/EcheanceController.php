<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Echeance;
use Illuminate\Http\Request;

class EcheanceController extends Controller
{
    public function index($officineId)
    {
        $echeances = Echeance::where('officine_id', $officineId)
            ->where('archived', false)
            ->orderBy('fait')
            ->orderBy('date_echeance')
            ->get();

        return response()->json($echeances);
    }

    public function indexGlobal(Request $request)
    {
        $officineId = $request->query('officine_id');
        $query = Echeance::where('archived', false);
        if ($officineId) {
            $query->where('officine_id', $officineId);
        }

        $echeances = $query->orderBy('fait')
            ->orderBy('date_echeance')
            ->get();

        return response()->json($echeances);
    }

    public function store(Request $request, $officineId = null)
    {
        $validated = $request->validate([
            'titre' => 'required|string|max:255',
            'categorie' => 'nullable|string|max:100',
            'date_echeance' => 'required|date',
            'officine_id' => 'nullable|uuid',
        ]);

        $finalOfficineId = $officineId 
            ?: ($validated['officine_id'] ?? null)
            ?: $request->user()?->officines()->first()?->id;

        $echeance = Echeance::create([
            'officine_id' => $finalOfficineId,
            'titre' => $validated['titre'],
            'categorie' => $validated['categorie'] ?? 'reglementaire',
            'date_echeance' => $validated['date_echeance'],
            'fait' => false,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json($echeance, 201);
    }

    public function update(Request $request, $id)
    {
        $echeance = Echeance::findOrFail($id);
        $echeance->update($request->only(['titre', 'categorie', 'date_echeance', 'fait', 'archived']));

        return response()->json($echeance);
    }

    public function destroy($id)
    {
        $echeance = Echeance::findOrFail($id);
        $echeance->update(['archived' => true]);

        return response()->json(['message' => 'Échéance archivée.']);
    }
}

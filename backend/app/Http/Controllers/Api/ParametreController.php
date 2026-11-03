<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OfficineParametre;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParametreController extends Controller
{
    /**
     * Liste des paramètres d'une officine
     */
    public function index(Request $request, string $officineId): JsonResponse
    {
        $parametres = OfficineParametre::where('officine_id', $officineId)
            ->where('archived', false)
            ->orderBy('cle')
            ->get();

        return response()->json($parametres);
    }

    /**
     * Mise à jour d'un paramètre (réservé au promoteur)
     */
    public function update(Request $request, string $officineId, string $cle): JsonResponse
    {
        $validated = $request->validate([
            'valeur' => 'required',
            'description' => 'nullable|string',
        ]);

        $param = OfficineParametre::where('officine_id', $officineId)
            ->where('cle', $cle)
            ->where('archived', false)
            ->firstOrFail();

        $valeurFormatee = is_array($validated['valeur']) ? $validated['valeur'] : ['valeur' => $validated['valeur']];

        $param->update([
            'valeur' => $valeurFormatee,
            'description' => $validated['description'] ?? $param->description,
            'version' => $param->version + 1,
        ]);

        return response()->json($param);
    }
}

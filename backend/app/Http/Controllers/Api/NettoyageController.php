<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NettoyageRegistre;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class NettoyageController extends Controller
{
    public function index(Request $request, string $officineId): JsonResponse
    {
        $nettoyages = NettoyageRegistre::where('officine_id', $officineId)
            ->with(['agent:id,name,email', 'visa:id,name,email'])
            ->orderByDesc('date_heure')
            ->paginate(30);

        return response()->json($nettoyages);
    }

    public function store(Request $request, string $officineId): JsonResponse
    {
        $validated = $request->validate([
            'zone' => 'required|string|in:comptoir,reserve,preparatoire,sanitaires_vestiaires,exterieur',
            'frequence' => 'nullable|string|in:quotidien,hebdomadaire,mensuel',
            'produit_utilise' => 'required|string|max:255',
            'conforme' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        $item = NettoyageRegistre::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $officineId,
            'zone' => $validated['zone'],
            'frequence' => $validated['frequence'] ?? 'quotidien',
            'produit_utilise' => $validated['produit_utilise'],
            'agent_id' => $request->user()?->id,
            'date_heure' => Carbon::now('Africa/Porto-Novo'),
            'conforme' => $validated['conforme'] ?? true,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json($item->load('agent:id,name,email'), 201);
    }
}

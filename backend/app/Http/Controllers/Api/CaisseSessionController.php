<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SessionCaisse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CaisseSessionController extends Controller
{
    /**
     * Session de caisse active pour l'utilisateur ou l'officine
     */
    public function sessionActive(Request $request): JsonResponse
    {
        $user = $request->user();
        $officineId = $user->officine_id;

        $session = SessionCaisse::where('officine_id', $officineId)
            ->where('statut', 'ouverte')
            ->with(['caissier', 'ventes' => function ($q) {
                $q->orderBy('created_at', 'desc')->take(10);
            }])
            ->latest('opened_at')
            ->first();

        return response()->json([
            'status' => 'success',
            'data' => $session,
        ]);
    }

    /**
     * Ouvrir une nouvelle session de caisse avec fond de caisse
     */
    public function ouvrir(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fond_caisse_ouverture' => 'required|numeric|min:0',
        ]);

        $user = $request->user();
        $officineId = $user->officine_id;

        // Vérifier si une session est déjà ouverte
        $active = SessionCaisse::where('officine_id', $officineId)
            ->where('statut', 'ouverte')
            ->first();

        if ($active) {
            return response()->json([
                'status' => 'error',
                'message' => 'Une session de caisse est déjà en cours.',
                'data' => $active,
            ], 422);
        }

        $annee = Carbon::now()->format('Y');
        $count = SessionCaisse::where('officine_id', $officineId)->whereYear('created_at', $annee)->count() + 1;
        $numSession = sprintf('CAISSE-%s-%04d', $annee, $count);

        $session = SessionCaisse::create([
            'officine_id' => $officineId,
            'caissier_id' => $user->id,
            'numero_session' => $numSession,
            'fond_caisse_ouverture' => $validated['fond_caisse_ouverture'],
            'total_encaisse_especes' => 0,
            'total_encaisse_mobile_money' => 0,
            'total_encaisse_carte' => 0,
            'fond_caisse_fermeture_theorique' => $validated['fond_caisse_ouverture'],
            'statut' => 'ouverte',
            'opened_at' => Carbon::now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Session de caisse {$session->numero_session} ouverte avec un fond de {$session->fond_caisse_ouverture} FCFA",
            'data' => $session->load('caissier'),
        ], 201);
    }

    /**
     * Clôture intermédiaire (Ticket X) : consultation sans fermer la session
     */
    public function ticketX(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $session = SessionCaisse::where('officine_id', $user->officine_id)->findOrFail($id);

        $totalVentes = $session->ventes()->where('statut', 'payee')->sum('montant_net_ttc');
        $nbVentes = $session->ventes()->where('statut', 'payee')->count();

        return response()->json([
            'status' => 'success',
            'type_rapport' => 'TICKET_X_INTERMEDIAIRE',
            'data' => [
                'session' => $session,
                'nombre_ventes' => $nbVentes,
                'chiffre_affaires_total' => (float) $totalVentes,
                'especes_theoriques' => (float) ($session->fond_caisse_ouverture + $session->total_encaisse_especes),
                'mobile_money' => (float) $session->total_encaisse_mobile_money,
                'carte_bancaire' => (float) $session->total_encaisse_carte,
            ],
        ]);
    }

    /**
     * Clôture journalière définitive (Ticket Z) avec billetage et calcul d'écart
     */
    public function fermer(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'fond_caisse_fermeture_reel' => 'required|numeric|min:0',
            'notes_cloture' => 'nullable|string',
        ]);

        $user = $request->user();
        $session = SessionCaisse::where('officine_id', $user->officine_id)->findOrFail($id);

        if ($session->statut === 'fermee') {
            return response()->json(['message' => 'Cette caisse est déjà clôturée.'], 422);
        }

        $reel = (float) $validated['fond_caisse_fermeture_reel'];
        $theorique = (float) $session->fond_caisse_fermeture_theorique;
        $ecart = $reel - $theorique;

        $session->update([
            'fond_caisse_fermeture_reel' => $reel,
            'ecart_caisse' => $ecart,
            'statut' => 'fermee',
            'closed_at' => Carbon::now(),
            'notes_cloture' => $validated['notes_cloture'] ?? null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Caisse clôturée avec succès (Ticket Z émis). Écart constaté : {$ecart} FCFA",
            'type_rapport' => 'TICKET_Z_DEFINITIF',
            'data' => $session->load(['caissier', 'ventes']),
        ]);
    }
}

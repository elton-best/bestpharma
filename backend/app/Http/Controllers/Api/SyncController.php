<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\OfficineParametre;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SyncController extends Controller
{
    /**
     * Traitement de la file d'opérations hors-ligne (E0-S7, NF-11)
     */
    public function push(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'operations' => 'required|array',
            'operations.*.operation_id' => 'required|string',
            'operations.*.officine_id' => 'required|string|uuid',
            'operations.*.entity' => 'required|string',
            'operations.*.action' => 'required|string',
            'operations.*.payload' => 'required|array',
            'operations.*.heure_locale_saisie' => 'required|string',
        ]);

        $results = [];
        $user = $request->user();

        DB::transaction(function () use ($validated, $user, &$results) {
            foreach ($validated['operations'] as $op) {
                $opId = $op['operation_id'];
                $officineId = $op['officine_id'];
                $entity = $op['entity'];
                $action = strtoupper($op['action']);
                $payload = $op['payload'];
                $heureLocale = $op['heure_locale_saisie'];

                // 1. Vérification d'idempotence (éviter les doublons de synchronisation)
                $alreadyLogged = AuditLog::where('officine_id', $officineId)
                    ->where('record_id', $opId)
                    ->exists();

                if ($alreadyLogged) {
                    $results[] = [
                        'operation_id' => $opId,
                        'status' => 'already_processed',
                        'message' => 'Opération déjà synchronisée précédemment.',
                        'server_timestamp' => now()->toISOString(),
                    ];

                    continue;
                }

                // 2. Traitement selon l'entité
                if ($entity === 'officine_parametres') {
                    $cle = $payload['cle'] ?? null;
                    if ($cle) {
                        $param = OfficineParametre::where('officine_id', $officineId)
                            ->where('cle', $cle)
                            ->first();

                        if ($param) {
                            $valeur = is_array($payload['valeur']) ? $payload['valeur'] : ['valeur' => $payload['valeur']];
                            $param->update([
                                'valeur' => $valeur,
                                'version' => $param->version + 1,
                            ]);
                        }
                    }
                }

                // 3. Enregistrement de l'événement de synchronisation avec l'heure locale
                AuditLog::create([
                    'officine_id' => $officineId,
                    'table_name' => 'sync_queue',
                    'record_id' => $opId,
                    'action' => $action,
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'old_data' => ['heure_locale_saisie' => $heureLocale],
                    'new_data' => $payload,
                    'ip_address' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                    'server_timestamp' => now(),
                ]);

                $results[] = [
                    'operation_id' => $opId,
                    'status' => 'synced',
                    'heure_locale_saisie' => $heureLocale,
                    'server_timestamp' => now()->toISOString(),
                ];
            }
        });

        return response()->json([
            'synced_count' => count(array_filter($results, fn ($r) => $r['status'] === 'synced')),
            'operations' => $results,
        ]);
    }
}

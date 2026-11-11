<?php

declare(strict_types=1);

namespace App\Modules\Accompagnement\Services;

use App\Modules\Tenancy\Services\OfficineAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class OfflineSyncService
{
    /** @return array{synced_count:int,operations:array<int,array<string,mixed>>} */
    public function push(Request $request, array $validated): array
    {
        $office = OfficineAccess::admin($request);

        return DB::transaction(function () use ($request, $validated, $office): array {
            OfficineAccess::lockAdmin($request, $office);
            $results = [];

            // Process in request order. A conflict rolls back the entire batch, so retry
            // after reconnect can never leave a partially acknowledged prefix.
            foreach ($validated['operations'] as $operation) {
                $operationId = strtolower($operation['operation_id']);
                $payload = $this->normalizedPayload($operation['payload']);
                $fingerprint = hash('sha256', json_encode([
                    $request->user()->id,
                    $operation['entity'],
                    $operation['action'],
                    $operation['client_timestamp'],
                    $payload,
                ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));

                $existing = DB::table('offline_sync_operations')
                    ->where('officine_id', $office)
                    ->where('operation_id', $operationId)
                    ->lockForUpdate()
                    ->first();

                if ($existing) {
                    if ($existing->user_id !== $request->user()->id || !hash_equals($existing->fingerprint, $fingerprint)) {
                        throw new SyncConflict('Identifiant d’opération déjà utilisé avec un contenu différent.');
                    }

                    $results[] = [
                        'operation_id' => $operationId,
                        'status' => 'already_processed',
                        'resource_id' => (int) $existing->resource_id,
                        'client_timestamp' => $existing->client_timestamp,
                        'server_received_at' => $existing->server_received_at,
                    ];
                    continue;
                }

                // The operation_id doubles as the draft API's tenant-scoped request_key.
                // Existing online creation therefore cannot be duplicated by a later sync.
                $sameKey = DB::table('support_requests')
                    ->where('officine_id', $office)
                    ->where('request_key', $operationId)
                    ->lockForUpdate()
                    ->first();
                if ($sameKey) {
                    throw new SyncConflict('Identifiant déjà utilisé par une demande existante.');
                }

                $now = now();
                $resourceId = DB::table('support_requests')->insertGetId($payload + [
                    'officine_id' => $office,
                    'created_by' => $request->user()->id,
                    'request_key' => $operationId,
                    'reference' => 'ACC-'.strtoupper(Str::random(16)),
                    'status' => 'draft',
                    'version' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                OfficineAccess::audit($request, $office, 'support.request.draft_created', [
                    'request_id' => $resourceId,
                    'version' => 1,
                    'source' => 'offline_sync',
                ]);

                $serverReceivedAt = now()->toISOString();
                DB::table('offline_sync_operations')->insert([
                    'officine_id' => $office,
                    'operation_id' => $operationId,
                    'user_id' => $request->user()->id,
                    'resource_id' => $resourceId,
                    'fingerprint' => $fingerprint,
                    'client_timestamp' => $operation['client_timestamp'],
                    'server_received_at' => $serverReceivedAt,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $results[] = [
                    'operation_id' => $operationId,
                    'status' => 'synced',
                    'resource_id' => $resourceId,
                    'client_timestamp' => $operation['client_timestamp'],
                    'server_received_at' => $serverReceivedAt,
                ];
            }

            return [
                'synced_count' => count(array_filter($results, fn (array $result): bool => $result['status'] === 'synced')),
                'operations' => $results,
            ];
        });
    }

    private function normalizedPayload(array $payload): array
    {
        return [
            'title' => $payload['title'] ?? null,
            'description' => $payload['description'] ?? null,
            'contact' => $payload['contact'] ?? null,
            'theme' => $payload['theme'] ?? null,
            'availability' => $payload['availability'] ?? null,
            'urgency' => $payload['urgency'] ?? 'normal',
        ];
    }
}

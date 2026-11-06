<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class VerificationAuditService
{
    public function verifier(string $officineId): array
    {
        // Une seule requête : les compteurs et liens proviennent du même instantané.
        $bilan = DB::selectOne(<<<'SQL'
            WITH chaine AS (
                SELECT a.*, public.audit_row_hash(to_jsonb(a)) AS attendu,
                    lag(empreinte_sha256) OVER (ORDER BY chain_sequence) AS hash_precedent,
                    row_number() OVER (ORDER BY chain_sequence) AS sequence_attendue
                FROM public.audit_logs a WHERE officine_id = ? AND chain_sequence IS NOT NULL
            ), ruptures AS (
                SELECT * FROM chaine WHERE empreinte_sha256 IS DISTINCT FROM attendu
                  OR empreinte_precedente IS DISTINCT FROM COALESCE(hash_precedent, repeat('0', 64))
                  OR chain_sequence <> sequence_attendue
            )
            SELECT (SELECT count(*) FROM chaine) AS verifiees,
                (SELECT count(*) FROM public.audit_logs WHERE officine_id = ? AND chain_sequence IS NULL) AS historiques,
                (SELECT id FROM ruptures ORDER BY chain_sequence LIMIT 1) AS premiere_rupture,
                (SELECT empreinte_sha256 FROM chaine ORDER BY chain_sequence DESC LIMIT 1) AS racine
            SQL, [$officineId, $officineId]);
        $rupture = $bilan->premiere_rupture !== null;
        $historique = (int) $bilan->historiques;
        $total = (int) $bilan->verifiees;
        $statut = $rupture ? 'rupture' : ($historique > 0 ? 'partiel' : ($total > 0 ? 'conforme' : 'vide'));
        return [
            'status' => $statut,
            'integre' => $statut === 'conforme',
            'total_entrees_verifiees' => $total,
            'entrees_historiques_non_chainees' => $historique,
            'premiere_rupture_id' => $bilan->premiere_rupture,
            'derniere_empreinte_racine' => $bilan->racine,
            'algorithme' => 'SHA-256, chaînage PostgreSQL par officine',
            'date_verification' => now()->toIso8601String(),
            'message' => match ($statut) {
                'rupture' => 'Une rupture du chaînage a été détectée. Le journal doit être examiné.',
                'partiel' => 'Les entrées historiques ne sont pas chaînées. L’intégrité globale ne peut pas être attestée.',
                'vide' => 'Aucune entrée chaînée à vérifier.',
                default => 'Les empreintes, les liens et la séquence des entrées ont été vérifiés côté serveur.',
            },
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Comptabilite\Services;

use App\Modules\Comptabilite\Models\ComptaCompte;
use App\Modules\Comptabilite\Models\ComptaEcriture;
use App\Modules\Comptabilite\Models\ComptaEcritureLigne;
use App\Modules\Comptabilite\Models\ComptaExercice;
use App\Modules\Comptabilite\Models\ComptaJournal;
use App\Modules\Dispensation\Models\Sale;
use App\Modules\Tresorerie\Models\ExpenseRequest;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ComptabiliteService
{
    public const DEFAULT_ACCOUNTS = [
        ['code' => '101000', 'label' => 'Capital social', 'classe' => 1, 'nature' => 'passif'],
        ['code' => '401000', 'label' => 'Fournisseurs d’exploitation (Grossistes)', 'classe' => 4, 'nature' => 'passif'],
        ['code' => '411000', 'label' => 'Clients officinaux & Tiers payants', 'classe' => 4, 'nature' => 'actif'],
        ['code' => '422000', 'label' => 'Personnel — Rémunérations dues', 'classe' => 4, 'nature' => 'passif'],
        ['code' => '431000', 'label' => 'Organismes sociaux (CNSS)', 'classe' => 4, 'nature' => 'passif'],
        ['code' => '443100', 'label' => 'TVA facturée sur ventes', 'classe' => 4, 'nature' => 'passif'],
        ['code' => '445200', 'label' => 'TVA récupérable sur achats', 'classe' => 4, 'nature' => 'actif'],
        ['code' => '521000', 'label' => 'Banques locales & Mobile Money', 'classe' => 5, 'nature' => 'actif'],
        ['code' => '571000', 'label' => 'Caisse officinale (Espèces)', 'classe' => 5, 'nature' => 'actif'],
        ['code' => '601000', 'label' => 'Achats de médicaments & produits pharmaceutiques', 'classe' => 6, 'nature' => 'charge'],
        ['code' => '605000', 'label' => 'Autres achats & dépenses d’exploitation', 'classe' => 6, 'nature' => 'charge'],
        ['code' => '661000', 'label' => 'Rémunérations directes du personnel', 'classe' => 6, 'nature' => 'charge'],
        ['code' => '701000', 'label' => 'Ventes de médicaments & produits officinaux', 'classe' => 7, 'nature' => 'produit'],
    ];

    public const DEFAULT_JOURNALS = [
        ['code' => 'VT', 'name' => 'Journal des Ventes & Dispensation', 'journal_type' => 'ventes'],
        ['code' => 'AC', 'name' => 'Journal des Achats & Réceptions', 'journal_type' => 'achats'],
        ['code' => 'CA', 'name' => 'Journal de Caisse', 'journal_type' => 'caisse'],
        ['code' => 'BQ', 'name' => 'Journal de Banque & Mobile Money', 'journal_type' => 'banque'],
        ['code' => 'OD', 'name' => 'Journal des Opérations Diverses', 'journal_type' => 'operations_diverses'],
    ];

    /**
     * Initialise de manière idempotente le plan SYSCOHADA, les journaux et l'exercice courant.
     */
    public function bootstrapOfficine(int $officineId): array
    {
        return DB::transaction(function () use ($officineId) {
            $accountsCreated = 0;
            foreach (self::DEFAULT_ACCOUNTS as $acc) {
                $created = ComptaCompte::firstOrCreate(
                    ['officine_id' => $officineId, 'code' => $acc['code']],
                    [...$acc, 'is_active' => true]
                );
                if ($created->wasRecentlyCreated) {
                    $accountsCreated++;
                }
            }

            $journalsCreated = 0;
            foreach (self::DEFAULT_JOURNALS as $j) {
                $created = ComptaJournal::firstOrCreate(
                    ['officine_id' => $officineId, 'code' => $j['code']],
                    [...$j, 'is_active' => true]
                );
                if ($created->wasRecentlyCreated) {
                    $journalsCreated++;
                }
            }

            $year = (int) Carbon::now()->year;
            $exercice = ComptaExercice::firstOrCreate(
                ['officine_id' => $officineId, 'code' => "EX-{$year}"],
                [
                    'label' => "Exercice {$year}",
                    'start_date' => "{$year}-01-01",
                    'end_date' => "{$year}-12-31",
                    'status' => 'ouvert',
                    'version' => 1,
                ]
            );

            return [
                'accounts_created' => $accountsCreated,
                'journals_created' => $journalsCreated,
                'exercice' => $exercice,
            ];
        });
    }

    /**
     * Synchronise de façon idempotente les ventes payées (M12) et dépenses décaissées (M13).
     */
    public function syncFromOperations(int $officineId, ?int $userId): array
    {
        $this->bootstrapOfficine($officineId);

        return DB::transaction(function () use ($officineId, $userId) {
            $exercice = ComptaExercice::where('officine_id', $officineId)
                ->where('status', 'ouvert')
                ->orderByDesc('start_date')
                ->first();

            if (!$exercice) {
                abort(422, 'Aucun exercice comptable ouvert pour recevoir les écritures.');
            }

            $vtJournal = ComptaJournal::where('officine_id', $officineId)->where('code', 'VT')->firstOrFail();
            $caJournal = ComptaJournal::where('officine_id', $officineId)->where('code', 'CA')->firstOrFail();

            $compteClient = ComptaCompte::where('officine_id', $officineId)->where('code', '411000')->firstOrFail();
            $compteVente = ComptaCompte::where('officine_id', $officineId)->where('code', '701000')->firstOrFail();
            $compteCharge = ComptaCompte::where('officine_id', $officineId)->where('code', '605000')->firstOrFail();
            $compteCaisse = ComptaCompte::where('officine_id', $officineId)->where('code', '571000')->firstOrFail();

            $salesSynced = 0;
            $sales = Sale::where('officine_id', $officineId)
                ->where('status', 'payee')
                ->where('total_amount', '>', 0)
                ->get();

            foreach ($sales as $sale) {
                $exists = ComptaEcriture::where('officine_id', $officineId)
                    ->where('source_type', 'sale')
                    ->where('source_id', $sale->id)
                    ->exists();
                if ($exists) {
                    continue;
                }

                $amount = round((float) $sale->total_amount, 2);
                $entryDate = ($sale->confirmed_at ?? $sale->created_at ?? now())->toDateString();
                $ref = "EC-VT-{$sale->id}";

                $ecriture = ComptaEcriture::create([
                    'officine_id' => $officineId,
                    'exercice_id' => $exercice->id,
                    'journal_id' => $vtJournal->id,
                    'reference' => $ref,
                    'entry_date' => $entryDate,
                    'label' => "Vente officinale {$sale->reference}",
                    'source_type' => 'sale',
                    'source_id' => $sale->id,
                    'idempotency_key' => "sync-sale-{$sale->id}",
                    'status' => 'validee',
                    'total_debit' => $amount,
                    'total_credit' => $amount,
                    'created_by_user_id' => $userId ?? 1,
                    'validated_by_user_id' => $userId ?? 1,
                    'validated_at' => now(),
                    'entry_hash' => hash('sha256', "{$officineId}|{$ref}|{$amount}|{$entryDate}"),
                    'version' => 1,
                ]);

                ComptaEcritureLigne::create([
                    'officine_id' => $officineId,
                    'ecriture_id' => $ecriture->id,
                    'compte_id' => $compteClient->id,
                    'line_order' => 1,
                    'label' => "Client / Encaissement {$sale->reference}",
                    'debit' => $amount,
                    'credit' => 0,
                ]);
                ComptaEcritureLigne::create([
                    'officine_id' => $officineId,
                    'ecriture_id' => $ecriture->id,
                    'compte_id' => $compteVente->id,
                    'line_order' => 2,
                    'label' => "Produit vente {$sale->reference}",
                    'debit' => 0,
                    'credit' => $amount,
                ]);
                $salesSynced++;
            }

            $expensesSynced = 0;
            $expenses = ExpenseRequest::where('officine_id', $officineId)
                ->where('status', 'decaissee')
                ->where('amount', '>', 0)
                ->get();

            foreach ($expenses as $exp) {
                $exists = ComptaEcriture::where('officine_id', $officineId)
                    ->where('source_type', 'expense_request')
                    ->where('source_id', $exp->id)
                    ->exists();
                if ($exists) {
                    continue;
                }

                $amount = round((float) $exp->amount, 2);
                $entryDate = ($exp->disbursed_at ?? $exp->created_at ?? now())->toDateString();
                $ref = "EC-CA-{$exp->id}";

                $ecriture = ComptaEcriture::create([
                    'officine_id' => $officineId,
                    'exercice_id' => $exercice->id,
                    'journal_id' => $caJournal->id,
                    'reference' => $ref,
                    'entry_date' => $entryDate,
                    'label' => "Décaissement {$exp->reference} ({$exp->category})",
                    'source_type' => 'expense_request',
                    'source_id' => $exp->id,
                    'idempotency_key' => "sync-expense-{$exp->id}",
                    'status' => 'validee',
                    'total_debit' => $amount,
                    'total_credit' => $amount,
                    'created_by_user_id' => $userId ?? 1,
                    'validated_by_user_id' => $userId ?? 1,
                    'validated_at' => now(),
                    'entry_hash' => hash('sha256', "{$officineId}|{$ref}|{$amount}|{$entryDate}"),
                    'version' => 1,
                ]);

                ComptaEcritureLigne::create([
                    'officine_id' => $officineId,
                    'ecriture_id' => $ecriture->id,
                    'compte_id' => $compteCharge->id,
                    'line_order' => 1,
                    'label' => "Charge {$exp->reference}",
                    'debit' => $amount,
                    'credit' => 0,
                ]);
                ComptaEcritureLigne::create([
                    'officine_id' => $officineId,
                    'ecriture_id' => $ecriture->id,
                    'compte_id' => $compteCaisse->id,
                    'line_order' => 2,
                    'label' => "Sortie caisse {$exp->reference}",
                    'debit' => 0,
                    'credit' => $amount,
                ]);
                $expensesSynced++;
            }

            return [
                'sales_synced' => $salesSynced,
                'expenses_synced' => $expensesSynced,
            ];
        });
    }

    /**
     * Calcule la balance générale SYSCOHADA sur les écritures validées.
     */
    public function computeBalance(int $officineId, ?int $exerciceId = null): array
    {
        if (!Schema::hasTable('compta_ecriture_lignes') || !Schema::hasTable('compta_ecritures') || !Schema::hasTable('compta_comptes')) {
            return [
                'rows' => [],
                'totals' => [
                    'total_debit' => 0.0,
                    'total_credit' => 0.0,
                    'solde_debiteur' => 0.0,
                    'solde_crediteur' => 0.0,
                    'is_balanced' => true,
                ],
                'warning' => 'Tables comptables non initialisées. Exécutez php artisan migrate.',
            ];
        }

        $query = ComptaEcritureLigne::query()
            ->join('compta_ecritures as e', 'e.id', '=', 'compta_ecriture_lignes.ecriture_id')
            ->join('compta_comptes as c', 'c.id', '=', 'compta_ecriture_lignes.compte_id')
            ->where('compta_ecriture_lignes.officine_id', $officineId)
            ->where('e.officine_id', $officineId)
            ->where('e.status', 'validee');

        if ($exerciceId) {
            $query->where('e.exercice_id', $exerciceId);
        }

        $rows = $query
            ->select([
                'c.id as compte_id',
                'c.code',
                'c.label',
                'c.classe',
                'c.nature',
                DB::raw('SUM(compta_ecriture_lignes.debit) as total_debit'),
                DB::raw('SUM(compta_ecriture_lignes.credit) as total_credit'),
            ])
            ->groupBy('c.id', 'c.code', 'c.label', 'c.classe', 'c.nature')
            ->orderBy('c.code')
            ->get()
            ->map(function ($row) {
                $debit = round((float) $row->total_debit, 2);
                $credit = round((float) $row->total_credit, 2);
                $diff = round($debit - $credit, 2);
                return [
                    'compte_id' => (int) $row->compte_id,
                    'code' => $row->code,
                    'label' => $row->label,
                    'classe' => (int) $row->classe,
                    'nature' => $row->nature,
                    'total_debit' => $debit,
                    'total_credit' => $credit,
                    'solde_debiteur' => $diff > 0 ? $diff : 0.0,
                    'solde_crediteur' => $diff < 0 ? abs($diff) : 0.0,
                ];
            })
            ->values()
            ->all();

        $sumDebit = round(array_sum(array_column($rows, 'total_debit')), 2);
        $sumCredit = round(array_sum(array_column($rows, 'total_credit')), 2);

        return [
            'rows' => $rows,
            'totals' => [
                'total_debit' => $sumDebit,
                'total_credit' => $sumCredit,
                'solde_debiteur' => round(array_sum(array_column($rows, 'solde_debiteur')), 2),
                'solde_crediteur' => round(array_sum(array_column($rows, 'solde_crediteur')), 2),
                'is_balanced' => abs($sumDebit - $sumCredit) < 0.01,
            ],
        ];
    }
}

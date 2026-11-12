<?php

declare(strict_types=1);

namespace App\Modules\Paie\Services;

use App\Modules\Paie\Models\PaieBareme;
use App\Modules\Paie\Models\PaieBulletin;
use App\Modules\Paie\Models\PaieVariable;
use Illuminate\Support\Facades\DB;

class PaieService
{
    public function bootstrapBareme(int $officineId): PaieBareme
    {
        return PaieBareme::firstOrCreate(
            ['officine_id' => $officineId, 'code' => 'BAREME-BJ-2026'],
            [
                'label' => 'Barème Officinal Bénin 2026 (CNSS 3.6% / 16.4% · ITS 10%)',
                'effective_from' => '2026-01-01',
                'effective_to' => null,
                'cnss_employee_rate' => 0.0360,
                'cnss_employer_rate' => 0.1640,
                'its_rate' => 0.1000,
                'overtime_multiplier' => 1.25,
                'is_active' => true,
            ]
        );
    }

    public function resolveApplicableBareme(int $officineId, string $periodMonth, ?int $explicitBaremeId = null): ?PaieBareme
    {
        if ($explicitBaremeId !== null) {
            return PaieBareme::where('officine_id', $officineId)
                ->where('is_active', true)
                ->find($explicitBaremeId);
        }

        $periodDate = "{$periodMonth}-01";

        return PaieBareme::where('officine_id', $officineId)
            ->where('is_active', true)
            ->where('effective_from', '<=', $periodDate)
            ->where(function ($q) use ($periodDate): void {
                $q->whereNull('effective_to')->orWhere('effective_to', '>=', $periodDate);
            })
            ->orderByDesc('effective_from')
            ->first();
    }

    public function computeAmounts(PaieVariable $var, PaieBareme $bareme): array
    {
        $overtimePay = round(
            (float) $var->overtime_hours * (float) $var->overtime_hourly_rate * (float) $bareme->overtime_multiplier,
            2
        );
        $gross = max(
            0.0,
            round((float) $var->base_salary + (float) $var->primes + $overtimePay - (float) $var->absences_deduction, 2)
        );
        $cnssEmployee = round($gross * (float) $bareme->cnss_employee_rate, 2);
        $cnssEmployer = round($gross * (float) $bareme->cnss_employer_rate, 2);
        $taxableBase = max(0.0, round($gross - $cnssEmployee, 2));
        $itsTax = round($taxableBase * (float) $bareme->its_rate, 2);
        $net = max(0.0, round($gross - $cnssEmployee - $itsTax, 2));

        return [
            'gross_salary' => $gross,
            'cnss_employee' => $cnssEmployee,
            'cnss_employer' => $cnssEmployer,
            'its_tax' => $itsTax,
            'net_salary' => $net,
        ];
    }

    public function buildDeclarations(int $officineId, ?string $periodMonth = null): array
    {
        $query = PaieBulletin::where('officine_id', $officineId)
            ->whereIn('status', ['valide', 'paye']);

        if ($periodMonth !== null && $periodMonth !== '') {
            $query->where('period_month', $periodMonth);
        }

        $rows = $query
            ->select([
                'period_month',
                DB::raw('COUNT(*) as bulletins_count'),
                DB::raw('SUM(gross_salary) as total_gross'),
                DB::raw('SUM(cnss_employee) as total_cnss_employee'),
                DB::raw('SUM(cnss_employer) as total_cnss_employer'),
                DB::raw('SUM(its_tax) as total_its'),
                DB::raw('SUM(net_salary) as total_net'),
            ])
            ->groupBy('period_month')
            ->orderByDesc('period_month')
            ->get()
            ->map(function ($r) {
                $cnssEmp = round((float) $r->total_cnss_employee, 2);
                $cnssPat = round((float) $r->total_cnss_employer, 2);
                return [
                    'period_month' => $r->period_month,
                    'bulletins_count' => (int) $r->bulletins_count,
                    'total_gross' => round((float) $r->total_gross, 2),
                    'total_cnss_employee' => $cnssEmp,
                    'total_cnss_employer' => $cnssPat,
                    'total_cnss_due' => round($cnssEmp + $cnssPat, 2),
                    'total_its' => round((float) $r->total_its, 2),
                    'total_net' => round((float) $r->total_net, 2),
                ];
            })
            ->values()
            ->all();

        return $rows;
    }
}

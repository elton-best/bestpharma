<?php

declare(strict_types=1);

namespace App\Modules\Paie\Models;

use App\Modules\Personnel\Models\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaieVariable extends Model
{
    protected $table = 'paie_variables';

    protected $fillable = [
        'officine_id',
        'employee_id',
        'period_month',
        'base_salary',
        'primes',
        'overtime_hours',
        'overtime_hourly_rate',
        'absences_deduction',
        'notes',
        'version',
    ];

    protected $casts = [
        'base_salary' => 'float',
        'primes' => 'float',
        'overtime_hours' => 'float',
        'overtime_hourly_rate' => 'float',
        'absences_deduction' => 'float',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}

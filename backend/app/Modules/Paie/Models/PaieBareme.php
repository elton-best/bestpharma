<?php

declare(strict_types=1);

namespace App\Modules\Paie\Models;

use Illuminate\Database\Eloquent\Model;

class PaieBareme extends Model
{
    protected $table = 'paie_baremes';

    protected $fillable = [
        'officine_id',
        'code',
        'label',
        'effective_from',
        'effective_to',
        'cnss_employee_rate',
        'cnss_employer_rate',
        'its_rate',
        'overtime_multiplier',
        'is_active',
    ];

    protected $casts = [
        'effective_from' => 'date:Y-m-d',
        'effective_to' => 'date:Y-m-d',
        'cnss_employee_rate' => 'float',
        'cnss_employer_rate' => 'float',
        'its_rate' => 'float',
        'overtime_multiplier' => 'float',
        'is_active' => 'boolean',
    ];
}

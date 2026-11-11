<?php

declare(strict_types=1);

namespace App\Modules\Reporting\Models;

use Illuminate\Database\Eloquent\Model;

class MetricDefinition extends Model
{
    protected $table = 'metric_definitions';

    protected $fillable = [
        'officine_id',
        'code',
        'module_key',
        'title',
        'definition',
        'numerator_label',
        'denominator_label',
        'unit',
        'required_permission',
        'is_validated',
        'is_active',
        'version',
    ];

    protected $casts = [
        'is_validated' => 'boolean',
        'is_active' => 'boolean',
        'version' => 'integer',
    ];
}

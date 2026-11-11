<?php

declare(strict_types=1);

namespace App\Modules\Reporting\Models;

use Illuminate\Database\Eloquent\Model;

class DashboardPreference extends Model
{
    protected $table = 'dashboard_preferences';

    protected $fillable = [
        'officine_id',
        'user_id',
        'default_period',
        'pinned_modules',
        'pinned_metric_codes',
        'version',
    ];

    protected $casts = [
        'pinned_modules' => 'array',
        'pinned_metric_codes' => 'array',
        'version' => 'integer',
    ];
}

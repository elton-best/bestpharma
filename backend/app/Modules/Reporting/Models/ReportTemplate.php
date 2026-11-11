<?php

declare(strict_types=1);

namespace App\Modules\Reporting\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReportTemplate extends Model
{
    protected $table = 'report_templates';

    protected $fillable = [
        'officine_id',
        'code',
        'title',
        'category',
        'description',
        'metric_codes',
        'default_format',
        'is_scheduled',
        'cron_schedule',
        'consent_confirmed',
        'recipients',
        'is_active',
        'version',
    ];

    protected $casts = [
        'metric_codes' => 'array',
        'is_scheduled' => 'boolean',
        'consent_confirmed' => 'boolean',
        'recipients' => 'array',
        'is_active' => 'boolean',
        'version' => 'integer',
    ];

    public function runs(): HasMany
    {
        return $this->hasMany(ReportRun::class, 'template_id');
    }
}

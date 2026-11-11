<?php

declare(strict_types=1);

namespace App\Modules\Reporting\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReportRun extends Model
{
    protected $table = 'report_runs';

    protected $fillable = [
        'officine_id',
        'template_id',
        'reference',
        'title',
        'period_start',
        'period_end',
        'comparison_period_start',
        'comparison_period_end',
        'filters',
        'computed_metrics',
        'status',
        'generated_by_user_id',
        'generated_at',
        'version',
    ];

    protected $casts = [
        'filters' => 'array',
        'computed_metrics' => 'array',
        'generated_at' => 'datetime',
        'version' => 'integer',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(ReportTemplate::class, 'template_id');
    }

    public function exports(): HasMany
    {
        return $this->hasMany(ReportExport::class, 'report_run_id');
    }

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by_user_id');
    }
}

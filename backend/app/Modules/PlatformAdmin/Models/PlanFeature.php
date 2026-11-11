<?php

declare(strict_types=1);

namespace App\Modules\PlatformAdmin\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanFeature extends Model
{
    protected $table = 'plan_features';

    protected $fillable = [
        'plan_id',
        'module_key',
        'feature_label',
        'is_included',
        'limit_value',
    ];

    protected $casts = [
        'is_included' => 'boolean',
        'limit_value' => 'integer',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }
}

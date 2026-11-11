<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiskActionLink extends Model
{
    protected $fillable = [
        'risk_id',
        'action_id',
        'mitigation_strategy',
    ];

    public function risk(): BelongsTo
    {
        return $this->belongsTo(RiskAndOpportunity::class, 'risk_id');
    }
}

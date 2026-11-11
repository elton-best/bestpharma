<?php

declare(strict_types=1);

namespace App\Modules\PlatformAdmin\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BillingEvent extends Model
{
    protected $table = 'billing_events';

    protected $fillable = [
        'officine_id',
        'subscription_id',
        'provider_name',
        'provider_event_id',
        'event_type',
        'amount',
        'currency',
        'status',
        'payload',
        'occurred_at',
    ];

    protected $casts = [
        'amount' => 'float',
        'payload' => 'array',
        'occurred_at' => 'datetime',
    ];

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class, 'subscription_id');
    }
}

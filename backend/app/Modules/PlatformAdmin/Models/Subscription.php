<?php

declare(strict_types=1);

namespace App\Modules\PlatformAdmin\Models;

use App\Modules\Tenancy\Models\Officine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    protected $table = 'subscriptions';

    protected $fillable = [
        'officine_id',
        'plan_id',
        'reference',
        'status',
        'started_at',
        'ends_at',
        'suspension_reason',
        'data_retained',
        'version',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ends_at' => 'datetime',
        'data_retained' => 'boolean',
        'version' => 'integer',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class, 'officine_id');
    }

    public function entitlements(): HasMany
    {
        return $this->hasMany(Entitlement::class, 'subscription_id');
    }
}

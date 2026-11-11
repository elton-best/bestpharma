<?php

declare(strict_types=1);

namespace App\Modules\PlatformAdmin\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Entitlement extends Model
{
    protected $table = 'entitlements';

    protected $fillable = [
        'officine_id',
        'subscription_id',
        'module_key',
        'is_enabled',
        'quota_limit',
        'version',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'quota_limit' => 'integer',
        'version' => 'integer',
    ];

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class, 'subscription_id');
    }
}

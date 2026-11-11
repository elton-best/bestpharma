<?php

declare(strict_types=1);

namespace App\Modules\PlatformAdmin\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditEvent extends Model
{
    protected $table = 'audit_events';

    protected $fillable = [
        'officine_id',
        'actor_user_id',
        'event_type',
        'target_type',
        'target_id',
        'metadata',
        'occurred_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'occurred_at' => 'datetime',
    ];

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}

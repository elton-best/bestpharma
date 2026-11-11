<?php

declare(strict_types=1);

namespace App\Modules\PlatformAdmin\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportAccessRequest extends Model
{
    protected $table = 'support_access_requests';

    protected $fillable = [
        'officine_id',
        'ticket_id',
        'requester_user_id',
        'reason',
        'requested_scope',
        'duration_hours',
        'status',
        'approved_by_user_id',
        'approved_at',
        'expires_at',
        'revoked_at',
        'version',
    ];

    protected $casts = [
        'requested_scope' => 'array',
        'duration_hours' => 'integer',
        'approved_at' => 'datetime',
        'expires_at' => 'datetime',
        'revoked_at' => 'datetime',
        'version' => 'integer',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(SupportTicket::class, 'ticket_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }
}

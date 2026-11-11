<?php

declare(strict_types=1);

namespace App\Modules\PlatformAdmin\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupportTicket extends Model
{
    protected $table = 'support_tickets';

    protected $fillable = [
        'officine_id',
        'reference',
        'subject',
        'description',
        'priority',
        'status',
        'opened_by_user_id',
        'assigned_to_user_id',
        'version',
    ];

    protected $casts = [
        'version' => 'integer',
    ];

    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by_user_id');
    }

    public function accessRequests(): HasMany
    {
        return $this->hasMany(SupportAccessRequest::class, 'ticket_id');
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Tresorerie\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Handover extends Model
{
    protected $table = 'handovers';

    protected $fillable = [
        'officine_id',
        'cash_session_id',
        'outgoing_user_id',
        'incoming_user_id',
        'theoretical_cash',
        'counted_cash',
        'variance_amount',
        'tickets_summary',
        'anomalies_notes',
        'outgoing_signed_at',
        'incoming_signed_at',
        'status',
        'created_action_id',
        'version',
    ];

    protected $casts = [
        'theoretical_cash' => 'float',
        'counted_cash' => 'float',
        'variance_amount' => 'float',
        'tickets_summary' => 'array',
        'outgoing_signed_at' => 'datetime',
        'incoming_signed_at' => 'datetime',
        'version' => 'integer',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(CashSession::class, 'cash_session_id');
    }

    public function outgoingUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'outgoing_user_id');
    }

    public function incomingUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'incoming_user_id');
    }
}

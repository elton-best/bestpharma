<?php

declare(strict_types=1);

namespace App\Modules\Tresorerie\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashMovement extends Model
{
    protected $table = 'cash_movements';

    protected $fillable = [
        'officine_id',
        'cash_session_id',
        'direction',
        'category',
        'amount',
        'reason',
        'status',
        'reversal_of_id',
        'recorded_by_user_id',
        'occurred_at',
    ];

    protected $casts = [
        'amount' => 'float',
        'occurred_at' => 'datetime',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(CashSession::class, 'cash_session_id');
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by_user_id');
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Tresorerie\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashCount extends Model
{
    protected $table = 'cash_counts';

    protected $fillable = [
        'officine_id',
        'cash_session_id',
        'handover_id',
        'count_type',
        'denominations',
        'total_counted',
        'counted_by_user_id',
        'counted_at',
    ];

    protected $casts = [
        'denominations' => 'array',
        'total_counted' => 'float',
        'counted_at' => 'datetime',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(CashSession::class, 'cash_session_id');
    }
}

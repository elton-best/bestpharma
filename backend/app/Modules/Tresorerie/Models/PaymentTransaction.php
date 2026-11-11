<?php

declare(strict_types=1);

namespace App\Modules\Tresorerie\Models;

use App\Models\User;
use App\Modules\Dispensation\Models\Sale;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentTransaction extends Model
{
    protected $table = 'payment_transactions';

    protected $fillable = [
        'officine_id',
        'cash_session_id',
        'sale_id',
        'transaction_ref',
        'idempotency_key',
        'transaction_type',
        'payment_method',
        'external_provider_ref',
        'amount',
        'status',
        'original_transaction_id',
        'reversal_reason',
        'recorded_by_user_id',
        'occurred_at',
        'version',
    ];

    protected $casts = [
        'amount' => 'float',
        'occurred_at' => 'datetime',
        'version' => 'integer',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(CashSession::class, 'cash_session_id');
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'sale_id');
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by_user_id');
    }
}

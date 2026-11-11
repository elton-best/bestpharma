<?php

declare(strict_types=1);

namespace App\Modules\Tresorerie\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpenseRequest extends Model
{
    protected $table = 'expense_requests';

    protected $fillable = [
        'officine_id',
        'cash_session_id',
        'reference',
        'category',
        'amount',
        'reason',
        'proof_reference',
        'status',
        'requested_by_user_id',
        'approved_by_user_id',
        'approved_at',
        'disbursed_at',
        'version',
    ];

    protected $casts = [
        'amount' => 'float',
        'approved_at' => 'datetime',
        'disbursed_at' => 'datetime',
        'version' => 'integer',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(CashSession::class, 'cash_session_id');
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }
}

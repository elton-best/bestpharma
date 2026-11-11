<?php

declare(strict_types=1);

namespace App\Modules\Tresorerie\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashSession extends Model
{
    protected $table = 'cash_sessions';

    protected $fillable = [
        'officine_id',
        'cash_register_id',
        'session_ref',
        'cashier_user_id',
        'opened_at',
        'closed_at',
        'opening_float',
        'expected_closing_balance',
        'actual_closing_balance',
        'discrepancy_amount',
        'discrepancy_justification',
        'status',
        'version',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'opening_float' => 'float',
        'expected_closing_balance' => 'float',
        'actual_closing_balance' => 'float',
        'discrepancy_amount' => 'float',
        'version' => 'integer',
    ];

    public function register(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class, 'cash_register_id');
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_user_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class, 'cash_session_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(CashMovement::class, 'cash_session_id');
    }

    public function handovers(): HasMany
    {
        return $this->hasMany(Handover::class, 'cash_session_id');
    }
}

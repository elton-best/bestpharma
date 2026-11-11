<?php

declare(strict_types=1);

namespace App\Modules\LocauxEquipements\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EquipmentWithdrawal extends Model
{
    protected $table = 'equipment_withdrawals';

    protected $fillable = [
        'officine_id',
        'equipment_id',
        'request_date',
        'requested_by_user_id',
        'withdrawal_reason',
        'destination',
        'status',
        'approved_by_user_id',
        'decided_at',
        'rejection_reason',
        'version',
    ];

    protected $casts = [
        'request_date' => 'date:Y-m-d',
        'decided_at' => 'datetime',
        'version' => 'integer',
    ];

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
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

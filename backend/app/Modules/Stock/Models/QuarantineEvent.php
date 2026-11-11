<?php

declare(strict_types=1);

namespace App\Modules\Stock\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuarantineEvent extends Model
{
    protected $table = 'quarantine_events';

    protected $fillable = [
        'officine_id',
        'lot_id',
        'product_id',
        'event_type',
        'quantity',
        'reason',
        'proof_reference',
        'status',
        'initiated_by_user_id',
        'validated_by_user_id',
        'validated_at',
        'created_action_id',
        'version',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'validated_at' => 'datetime',
        'version' => 'integer',
    ];

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class, 'lot_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function initiatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initiated_by_user_id');
    }

    public function validatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by_user_id');
    }
}

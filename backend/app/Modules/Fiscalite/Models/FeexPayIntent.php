<?php

declare(strict_types=1);

namespace App\Modules\Fiscalite\Models;

use Illuminate\Database\Eloquent\Model;

class FeexPayIntent extends Model
{
    protected $table = 'feexpay_intents';

    protected $fillable = [
        'officine_id',
        'sale_id',
        'reference',
        'amount',
        'currency',
        'network',
        'phone_number',
        'status',
        'provider_reference',
        'callback_payload',
        'confirmed_at',
        'idempotency_key',
        'version',
    ];

    protected $casts = [
        'amount' => 'float',
        'callback_payload' => 'array',
        'confirmed_at' => 'datetime',
    ];
}

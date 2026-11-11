<?php

declare(strict_types=1);

namespace App\Modules\Dispensation\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Credit extends Model
{
    protected $table = 'credits';

    protected $fillable = [
        'officine_id',
        'credit_ref',
        'sale_id',
        'return_id',
        'amount',
        'status',
        'issued_by_user_id',
        'issued_at',
        'reason',
        'version',
    ];

    protected $casts = [
        'amount' => 'float',
        'issued_at' => 'datetime',
        'version' => 'integer',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'sale_id');
    }

    public function saleReturn(): BelongsTo
    {
        return $this->belongsTo(SaleReturn::class, 'return_id');
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by_user_id');
    }
}

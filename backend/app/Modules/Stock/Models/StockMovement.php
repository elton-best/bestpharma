<?php

declare(strict_types=1);

namespace App\Modules\Stock\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    protected $table = 'stock_movements';

    protected $fillable = [
        'officine_id',
        'product_id',
        'lot_id',
        'movement_type',
        'quantity_delta',
        'balance_after',
        'reference_type',
        'reference_id',
        'reason',
        'performed_by_user_id',
        'performed_at',
    ];

    protected $casts = [
        'quantity_delta' => 'integer',
        'balance_after' => 'integer',
        'performed_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class, 'lot_id');
    }

    public function performedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by_user_id');
    }
}

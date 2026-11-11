<?php

declare(strict_types=1);

namespace App\Modules\Stock\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryLine extends Model
{
    protected $table = 'inventory_lines';

    protected $fillable = [
        'officine_id',
        'inventory_id',
        'product_id',
        'lot_id',
        'theoretical_qty',
        'counted_qty',
        'variance_qty',
        'justification',
    ];

    protected $casts = [
        'theoretical_qty' => 'integer',
        'counted_qty' => 'integer',
        'variance_qty' => 'integer',
    ];

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class, 'inventory_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class, 'lot_id');
    }
}

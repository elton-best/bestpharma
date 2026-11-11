<?php

declare(strict_types=1);

namespace App\Modules\Stock\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderLine extends Model
{
    protected $table = 'order_lines';

    protected $fillable = [
        'officine_id',
        'purchase_order_id',
        'product_id',
        'ordered_qty',
        'received_qty',
        'unit_price',
        'line_total',
    ];

    protected $casts = [
        'ordered_qty' => 'integer',
        'received_qty' => 'integer',
        'unit_price' => 'float',
        'line_total' => 'float',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}

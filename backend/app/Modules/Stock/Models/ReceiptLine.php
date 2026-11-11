<?php

declare(strict_types=1);

namespace App\Modules\Stock\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReceiptLine extends Model
{
    protected $table = 'receipt_lines';

    protected $fillable = [
        'officine_id',
        'receipt_id',
        'order_line_id',
        'product_id',
        'lot_id',
        'batch_number',
        'expiry_date',
        'ordered_qty',
        'received_qty',
        'accepted_qty',
        'rejected_qty',
        'unit_cost',
        'conformity_status',
        'notes',
    ];

    protected $casts = [
        'ordered_qty' => 'integer',
        'received_qty' => 'integer',
        'accepted_qty' => 'integer',
        'rejected_qty' => 'integer',
        'unit_cost' => 'float',
    ];

    public function receipt(): BelongsTo
    {
        return $this->belongsTo(Receipt::class, 'receipt_id');
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

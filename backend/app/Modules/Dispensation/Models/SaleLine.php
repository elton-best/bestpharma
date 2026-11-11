<?php

declare(strict_types=1);

namespace App\Modules\Dispensation\Models;

use App\Modules\Stock\Models\Lot;
use App\Modules\Stock\Models\Product;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleLine extends Model
{
    protected $table = 'sale_lines';

    protected $fillable = [
        'officine_id',
        'sale_id',
        'product_id',
        'lot_id',
        'quantity',
        'unit_price',
        'line_total',
        'dispensing_advice',
        'is_substituted',
        'substitution_reason',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'float',
        'line_total' => 'float',
        'is_substituted' => 'boolean',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'sale_id');
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

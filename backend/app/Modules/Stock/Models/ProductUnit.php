<?php

declare(strict_types=1);

namespace App\Modules\Stock\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductUnit extends Model
{
    protected $table = 'product_units';

    protected $fillable = [
        'officine_id',
        'product_id',
        'unit_name',
        'conversion_factor',
        'is_default_dispense',
    ];

    protected $casts = [
        'conversion_factor' => 'integer',
        'is_default_dispense' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Stock\Models;

use App\Modules\Achats\Models\Supplier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $table = 'products';

    protected $fillable = [
        'officine_id',
        'code',
        'barcode',
        'name',
        'dci',
        'dosage',
        'pharmaceutical_form',
        'base_unit',
        'category',
        'default_supplier_id',
        'storage_condition',
        'is_thermosensitive',
        'min_stock_threshold',
        'reorder_quantity',
        'purchase_price',
        'selling_price',
        'amm_number',
        'amm_source_verified',
        'amm_source_label',
        'is_active',
        'version',
    ];

    protected $casts = [
        'is_thermosensitive' => 'boolean',
        'amm_source_verified' => 'boolean',
        'is_active' => 'boolean',
        'min_stock_threshold' => 'integer',
        'reorder_quantity' => 'integer',
        'purchase_price' => 'float',
        'selling_price' => 'float',
        'version' => 'integer',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'default_supplier_id');
    }

    public function units(): HasMany
    {
        return $this->hasMany(ProductUnit::class, 'product_id');
    }

    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class, 'product_id');
    }
}

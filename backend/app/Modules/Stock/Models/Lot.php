<?php

declare(strict_types=1);

namespace App\Modules\Stock\Models;

use App\Modules\Achats\Models\Supplier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lot extends Model
{
    protected $table = 'lots';

    protected $fillable = [
        'officine_id',
        'product_id',
        'supplier_id',
        'batch_number',
        'expiry_date',
        'storage_zone',
        'initial_qty',
        'available_qty',
        'reserved_qty',
        'unit_cost',
        'status',
        'is_sellable',
        'version',
    ];

    protected $casts = [
        'initial_qty' => 'integer',
        'available_qty' => 'integer',
        'reserved_qty' => 'integer',
        'unit_cost' => 'float',
        'is_sellable' => 'boolean',
        'version' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'lot_id');
    }

    public function quarantineEvents(): HasMany
    {
        return $this->hasMany(QuarantineEvent::class, 'lot_id');
    }
}

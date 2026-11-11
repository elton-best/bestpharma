<?php

declare(strict_types=1);

namespace App\Modules\Dispensation\Models;

use App\Models\User;
use App\Modules\Stock\Models\Lot;
use App\Modules\Stock\Models\Product;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DispensingEvent extends Model
{
    protected $table = 'dispensing_events';

    protected $fillable = [
        'officine_id',
        'sale_id',
        'sale_line_id',
        'lot_id',
        'product_id',
        'quantity_dispensed',
        'dispensed_by_user_id',
        'dispensed_at',
        'counsel_given',
    ];

    protected $casts = [
        'quantity_dispensed' => 'integer',
        'dispensed_at' => 'datetime',
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

    public function dispensedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dispensed_by_user_id');
    }
}

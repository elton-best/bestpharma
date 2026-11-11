<?php

declare(strict_types=1);

namespace App\Modules\Dispensation\Models;

use App\Models\User;
use App\Modules\Stock\Models\Lot;
use App\Modules\Stock\Models\Product;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleReturn extends Model
{
    protected $table = 'returns';

    protected $fillable = [
        'officine_id',
        'reference',
        'sale_id',
        'sale_line_id',
        'product_id',
        'lot_id',
        'quantity_returned',
        'reason',
        'pharmacist_decision',
        'status',
        'requested_by_user_id',
        'evaluated_by_user_id',
        'evaluated_at',
        'created_action_id',
        'version',
    ];

    protected $casts = [
        'quantity_returned' => 'integer',
        'evaluated_at' => 'datetime',
        'version' => 'integer',
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

    public function evaluatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluated_by_user_id');
    }
}

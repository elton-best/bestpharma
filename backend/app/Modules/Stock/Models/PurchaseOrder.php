<?php

declare(strict_types=1);

namespace App\Modules\Stock\Models;

use App\Models\User;
use App\Modules\Achats\Models\Supplier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    protected $table = 'purchase_orders';

    protected $fillable = [
        'officine_id',
        'reference',
        'supplier_id',
        'status',
        'order_date',
        'expected_delivery_date',
        'suggestion_origin',
        'total_estimated_amount',
        'created_by_user_id',
        'approved_by_user_id',
        'approved_at',
        'emitted_at',
        'notes',
        'version',
    ];

    protected $casts = [
        'suggestion_origin' => 'array',
        'total_estimated_amount' => 'float',
        'approved_at' => 'datetime',
        'emitted_at' => 'datetime',
        'version' => 'integer',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(OrderLine::class, 'purchase_order_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }
}

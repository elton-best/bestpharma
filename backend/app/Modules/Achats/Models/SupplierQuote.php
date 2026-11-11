<?php

declare(strict_types=1);

namespace App\Modules\Achats\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierQuote extends Model
{
    protected $table = 'supplier_quotes';

    protected $fillable = [
        'officine_id',
        'selection_id',
        'supplier_id',
        'amount',
        'delivery_days',
        'technical_score',
        'financial_score',
        'total_score',
        'is_retained',
        'comments',
    ];

    protected $casts = [
        'amount' => 'float',
        'delivery_days' => 'integer',
        'technical_score' => 'float',
        'financial_score' => 'float',
        'total_score' => 'float',
        'is_retained' => 'boolean',
    ];

    public function selection(): BelongsTo
    {
        return $this->belongsTo(SupplierSelection::class, 'selection_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }
}

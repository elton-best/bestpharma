<?php

declare(strict_types=1);

namespace App\Modules\Achats\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierComplaint extends Model
{
    protected $table = 'supplier_complaints';

    protected $fillable = [
        'officine_id',
        'supplier_id',
        'reference',
        'claim_type',
        'claim_date',
        'order_reference',
        'delivery_note_ref',
        'description',
        'status',
        'supplier_response',
        'response_received_at',
        'refund_or_credit_amount',
        'created_action_id',
        'version',
    ];

    protected $casts = [
        'claim_date' => 'date:Y-m-d',
        'response_received_at' => 'date:Y-m-d',
        'refund_or_credit_amount' => 'float',
        'version' => 'integer',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }
}

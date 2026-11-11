<?php

declare(strict_types=1);

namespace App\Modules\Stock\Models;

use App\Models\User;
use App\Modules\Achats\Models\Supplier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Receipt extends Model
{
    protected $table = 'receipts';

    protected $fillable = [
        'officine_id',
        'reference',
        'idempotency_key',
        'purchase_order_id',
        'supplier_id',
        'delivery_note_ref',
        'parcel_count',
        'received_at',
        'received_by_user_id',
        'has_thermosensitive_items',
        'arrival_temperature',
        'cold_chain_compliant',
        'pharmacist_decision',
        'reserves',
        'status',
        'created_action_id',
        'version',
    ];

    protected $casts = [
        'received_at' => 'datetime',
        'parcel_count' => 'integer',
        'has_thermosensitive_items' => 'boolean',
        'arrival_temperature' => 'float',
        'cold_chain_compliant' => 'boolean',
        'version' => 'integer',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(ReceiptLine::class, 'receipt_id');
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by_user_id');
    }
}

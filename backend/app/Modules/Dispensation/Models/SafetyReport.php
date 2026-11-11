<?php

declare(strict_types=1);

namespace App\Modules\Dispensation\Models;

use App\Models\User;
use App\Modules\Stock\Models\Lot;
use App\Modules\Stock\Models\Product;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SafetyReport extends Model
{
    protected $table = 'safety_reports';

    protected $fillable = [
        'officine_id',
        'reference',
        'sale_id',
        'product_id',
        'lot_id',
        'report_type',
        'severity',
        'description',
        'external_transmission_status',
        'external_ack_ref',
        'reported_by_user_id',
        'reported_at',
        'created_action_id',
        'version',
    ];

    protected $casts = [
        'reported_at' => 'datetime',
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

    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by_user_id');
    }
}

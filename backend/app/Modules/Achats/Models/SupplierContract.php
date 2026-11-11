<?php

declare(strict_types=1);

namespace App\Modules\Achats\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierContract extends Model
{
    protected $table = 'supplier_contracts';

    protected $fillable = [
        'officine_id',
        'supplier_id',
        'contract_ref',
        'title',
        'start_date',
        'end_date',
        'auto_renewal',
        'notice_days',
        'status',
        'terms_summary',
        'version',
    ];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'auto_renewal' => 'boolean',
        'notice_days' => 'integer',
        'version' => 'integer',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }
}

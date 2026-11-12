<?php

declare(strict_types=1);

namespace App\Modules\Fiscalite\Models;

use Illuminate\Database\Eloquent\Model;

class FiscalInvoice extends Model
{
    protected $table = 'fiscal_invoices';

    protected $fillable = [
        'officine_id',
        'sale_id',
        'reference',
        'invoice_type',
        'customer_ifu',
        'customer_name',
        'total_ht',
        'total_tva',
        'total_ttc',
        'status',
        'mecef_uid',
        'mecef_code',
        'mecef_qr_data',
        'mecef_counters',
        'certified_at',
        'idempotency_key',
        'version',
    ];

    protected $casts = [
        'total_ht' => 'float',
        'total_tva' => 'float',
        'total_ttc' => 'float',
        'certified_at' => 'datetime',
    ];
}

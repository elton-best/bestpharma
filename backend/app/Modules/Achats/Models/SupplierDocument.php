<?php

declare(strict_types=1);

namespace App\Modules\Achats\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierDocument extends Model
{
    protected $table = 'supplier_documents';

    protected $fillable = [
        'officine_id',
        'supplier_id',
        'document_type',
        'title',
        'document_ref',
        'valid_until',
        'file_path',
        'is_valid',
    ];

    protected $casts = [
        'valid_until' => 'date:Y-m-d',
        'is_valid' => 'boolean',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }
}

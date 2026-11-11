<?php

declare(strict_types=1);

namespace App\Modules\Dispensation\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrescriptionReference extends Model
{
    protected $table = 'prescription_references';

    protected $fillable = [
        'officine_id',
        'sale_id',
        'prescription_ref',
        'prescriber_name',
        'prescriber_qualification',
        'prescription_date',
        'document_id',
        'is_controlled_substance',
        'notes',
    ];

    protected $casts = [
        'is_controlled_substance' => 'boolean',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'sale_id');
    }
}

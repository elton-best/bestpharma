<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class InspectionItem extends Model
{
    protected $table = 'inspection_items';

    protected $fillable = [
        'inspection_id',
        'bpd_reference',
        'chapter',
        'requirement',
        'guidance',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(Inspection::class);
    }

    public function response(): HasOne
    {
        return $this->hasOne(InspectionResponse::class, 'item_id');
    }
}

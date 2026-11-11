<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InspectionResponse extends Model
{
    protected $table = 'inspection_responses';

    protected $fillable = [
        'inspection_id',
        'item_id',
        'status',
        'observed_facts',
        'evidence_notes',
        'finding_type',
        'evaluated_by',
        'evaluated_at',
    ];

    protected $casts = [
        'evaluated_at' => 'datetime',
    ];

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(Inspection::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(InspectionItem::class, 'item_id');
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluated_by');
    }

    public function actionLinks(): HasMany
    {
        return $this->hasMany(InspectionActionLink::class, 'response_id');
    }
}

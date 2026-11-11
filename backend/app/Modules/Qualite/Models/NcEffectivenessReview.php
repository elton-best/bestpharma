<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NcEffectivenessReview extends Model
{
    protected $fillable = [
        'nonconformity_id',
        'complaint_id',
        'criteria_evaluated',
        'is_effective',
        'observations',
        'decision',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'is_effective' => 'boolean',
        'reviewed_at' => 'datetime',
    ];

    public function nonconformity(): BelongsTo
    {
        return $this->belongsTo(Nonconformity::class, 'nonconformity_id');
    }

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class, 'complaint_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}

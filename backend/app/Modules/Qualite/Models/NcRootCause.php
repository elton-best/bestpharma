<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NcRootCause extends Model
{
    protected $fillable = [
        'nonconformity_id',
        'method',
        'why_1',
        'why_2',
        'why_3',
        'why_4',
        'why_5',
        'main_cause',
        'analyzed_by',
        'analyzed_at',
    ];

    protected $casts = [
        'analyzed_at' => 'datetime',
    ];

    public function nonconformity(): BelongsTo
    {
        return $this->belongsTo(Nonconformity::class, 'nonconformity_id');
    }

    public function analyst(): BelongsTo
    {
        return $this->belongsTo(User::class, 'analyzed_by');
    }
}

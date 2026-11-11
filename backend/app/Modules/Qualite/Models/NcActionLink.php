<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NcActionLink extends Model
{
    protected $fillable = [
        'nonconformity_id',
        'complaint_id',
        'action_id',
    ];

    public function nonconformity(): BelongsTo
    {
        return $this->belongsTo(Nonconformity::class, 'nonconformity_id');
    }

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class, 'complaint_id');
    }
}

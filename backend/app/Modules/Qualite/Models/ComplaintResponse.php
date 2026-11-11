<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplaintResponse extends Model
{
    protected $fillable = [
        'complaint_id',
        'response_channel',
        'response_content',
        'decision_type',
        'communicated_at',
        'communicated_by',
    ];

    protected $casts = [
        'communicated_at' => 'datetime',
    ];

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class, 'complaint_id');
    }

    public function communicator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'communicated_by');
    }
}

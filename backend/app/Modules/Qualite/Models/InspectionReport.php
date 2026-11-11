<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InspectionReport extends Model
{
    protected $table = 'inspection_reports';

    protected $fillable = [
        'inspection_id',
        'reference',
        'methodology',
        'summary_findings',
        'strengths',
        'weaknesses',
        'conclusions',
        'recommendations',
        'status',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'sha256_hash',
        'version',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'version' => 'integer',
    ];

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(Inspection::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}

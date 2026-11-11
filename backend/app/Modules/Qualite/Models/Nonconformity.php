<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use App\Models\User;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Nonconformity extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'officine_id',
        'reference',
        'source_type',
        'complaint_id',
        'activity_domain',
        'title',
        'description',
        'detection_date',
        'detected_by',
        'nature',
        'severity',
        'immediate_actions',
        'status',
        'version',
        'created_by',
        'closed_at',
        'closed_by',
    ];

    protected $casts = [
        'detection_date' => 'date:Y-m-d',
        'closed_at' => 'datetime',
        'version' => 'integer',
    ];

    public function detector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'detected_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class, 'complaint_id');
    }

    public function rootCause(): HasOne
    {
        return $this->hasOne(NcRootCause::class, 'nonconformity_id');
    }

    public function actionLinks(): HasMany
    {
        return $this->hasMany(NcActionLink::class, 'nonconformity_id');
    }

    public function effectivenessReviews(): HasMany
    {
        return $this->hasMany(NcEffectivenessReview::class, 'nonconformity_id')->orderByDesc('id');
    }
}

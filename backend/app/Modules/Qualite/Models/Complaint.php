<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use App\Models\User;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Complaint extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'officine_id',
        'reference',
        'channel',
        'complainant_type',
        'complainant_name',
        'complainant_contact',
        'is_anonymous',
        'category',
        'title',
        'description',
        'desired_solution',
        'received_date',
        'status',
        'assigned_to',
        'version',
        'created_by',
        'closed_at',
        'closed_by',
    ];

    protected $casts = [
        'is_anonymous' => 'boolean',
        'received_date' => 'date:Y-m-d',
        'closed_at' => 'datetime',
        'version' => 'integer',
    ];

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(ComplaintResponse::class, 'complaint_id')->orderByDesc('id');
    }

    public function nonconformities(): HasMany
    {
        return $this->hasMany(Nonconformity::class, 'complaint_id');
    }

    public function actionLinks(): HasMany
    {
        return $this->hasMany(NcActionLink::class, 'complaint_id');
    }

    public function effectivenessReviews(): HasMany
    {
        return $this->hasMany(NcEffectivenessReview::class, 'complaint_id')->orderByDesc('id');
    }
}

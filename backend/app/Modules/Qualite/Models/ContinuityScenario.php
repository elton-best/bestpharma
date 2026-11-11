<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use App\Models\User;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContinuityScenario extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'officine_id',
        'reference',
        'title',
        'threat_type',
        'trigger_events',
        'immediate_actions',
        'alternative_operations',
        'rto_hours',
        'coordinator_id',
        'crisis_contacts',
        'status',
        'version',
        'created_by',
    ];

    protected $casts = [
        'rto_hours' => 'integer',
        'crisis_contacts' => 'array',
        'version' => 'integer',
    ];

    public function coordinator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coordinator_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function exercises(): HasMany
    {
        return $this->hasMany(ContinuityExercise::class, 'scenario_id')->orderByDesc('exercise_date');
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContinuityExercise extends Model
{
    protected $fillable = [
        'scenario_id',
        'title',
        'test_type',
        'exercise_date',
        'conducted_by',
        'measured_recovery_minutes',
        'is_successful',
        'findings',
        'improvement_points',
    ];

    protected $casts = [
        'exercise_date' => 'date:Y-m-d',
        'measured_recovery_minutes' => 'integer',
        'is_successful' => 'boolean',
    ];

    public function scenario(): BelongsTo
    {
        return $this->belongsTo(ContinuityScenario::class, 'scenario_id');
    }

    public function conductor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'conducted_by');
    }
}

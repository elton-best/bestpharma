<?php

declare(strict_types=1);

namespace App\Modules\Personnel\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingSession extends Model
{
    protected $table = 'training_sessions';

    protected $fillable = [
        'officine_id',
        'training_plan_id',
        'session_date',
        'start_time',
        'end_time',
        'location',
        'trainer_name',
        'status',
        'notes',
        'version',
    ];

    protected $casts = [
        'session_date' => 'date:Y-m-d',
        'version' => 'integer',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(TrainingPlan::class, 'training_plan_id');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(TrainingAttendance::class, 'training_session_id');
    }
}

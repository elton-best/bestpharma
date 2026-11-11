<?php

declare(strict_types=1);

namespace App\Modules\Personnel\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingPlan extends Model
{
    protected $table = 'training_plans';

    protected $fillable = [
        'officine_id',
        'year',
        'theme',
        'description',
        'trainer_organization',
        'training_type',
        'duration_hours',
        'target_audience',
        'status',
        'target_date',
        'version',
    ];

    protected $casts = [
        'year' => 'integer',
        'duration_hours' => 'integer',
        'target_date' => 'date:Y-m-d',
        'version' => 'integer',
    ];

    public function sessions(): HasMany
    {
        return $this->hasMany(TrainingSession::class, 'training_plan_id');
    }
}

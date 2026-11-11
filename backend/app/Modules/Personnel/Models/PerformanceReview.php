<?php

declare(strict_types=1);

namespace App\Modules\Personnel\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerformanceReview extends Model
{
    protected $table = 'performance_reviews';

    protected $fillable = [
        'officine_id',
        'employee_id',
        'reviewer_id',
        'review_type',
        'review_period',
        'review_date',
        'criteria_scores',
        'overall_score',
        'strengths',
        'improvements',
        'action_plan',
        'status',
        'is_confidential',
        'version',
    ];

    protected $casts = [
        'review_date' => 'date:Y-m-d',
        'criteria_scores' => 'array',
        'overall_score' => 'float',
        'is_confidential' => 'boolean',
        'version' => 'integer',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}

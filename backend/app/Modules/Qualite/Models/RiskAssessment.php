<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiskAssessment extends Model
{
    protected $fillable = [
        'risk_id',
        'assessment_type',
        'probability',
        'impact',
        'score',
        'criticality_level',
        'grid_version',
        'rationale',
        'evaluated_by',
        'evaluated_at',
    ];

    protected $casts = [
        'probability' => 'integer',
        'impact' => 'integer',
        'score' => 'integer',
        'evaluated_at' => 'datetime',
    ];

    public static function calculateScoreAndLevel(int $probability, int $impact): array
    {
        $score = $probability * $impact;
        $level = match (true) {
            $score >= 13 => 'critique',
            $score >= 9 => 'eleve',
            $score >= 5 => 'modere',
            default => 'faible',
        };

        return [
            'score' => $score,
            'criticality_level' => $level,
        ];
    }

    public function risk(): BelongsTo
    {
        return $this->belongsTo(RiskAndOpportunity::class, 'risk_id');
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluated_by');
    }
}

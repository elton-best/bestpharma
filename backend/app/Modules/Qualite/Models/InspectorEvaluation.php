<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InspectorEvaluation extends Model
{
    protected $table = 'inspector_evaluations';

    protected $fillable = [
        'inspection_id',
        'inspector_id',
        'evaluator_id',
        'methodology_score',
        'objectivity_score',
        'reporting_score',
        'comments',
    ];

    protected $casts = [
        'methodology_score' => 'integer',
        'objectivity_score' => 'integer',
        'reporting_score' => 'integer',
    ];

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(Inspection::class);
    }

    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }
}

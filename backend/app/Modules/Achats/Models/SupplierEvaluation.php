<?php

declare(strict_types=1);

namespace App\Modules\Achats\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierEvaluation extends Model
{
    protected $table = 'supplier_evaluations';

    protected $fillable = [
        'officine_id',
        'supplier_id',
        'template_id',
        'period',
        'evaluation_date',
        'evaluator_user_id',
        'criteria_scores',
        'overall_score_on_5',
        'percentage_score',
        'decision',
        'strengths',
        'weaknesses',
        'action_required',
        'created_action_id',
        'version',
    ];

    protected $casts = [
        'evaluation_date' => 'date:Y-m-d',
        'criteria_scores' => 'array',
        'overall_score_on_5' => 'float',
        'percentage_score' => 'float',
        'version' => 'integer',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(SupplierEvaluationTemplate::class, 'template_id');
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluator_user_id');
    }
}

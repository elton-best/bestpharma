<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use App\Models\User;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class RiskAndOpportunity extends Model
{
    use BelongsToCompany;

    protected $table = 'risks_and_opportunities';

    protected $fillable = [
        'officine_id',
        'reference',
        'type',
        'process_scope',
        'title',
        'description',
        'causes',
        'consequences',
        'owner_id',
        'status',
        'version',
        'created_by',
    ];

    protected $casts = [
        'version' => 'integer',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(RiskAssessment::class, 'risk_id')->orderBy('id');
    }

    public function initialAssessment(): HasOne
    {
        return $this->hasOne(RiskAssessment::class, 'risk_id')->where('assessment_type', 'initial');
    }

    public function residualAssessment(): HasOne
    {
        return $this->hasOne(RiskAssessment::class, 'risk_id')->where('assessment_type', 'residual');
    }

    public function actionLinks(): HasMany
    {
        return $this->hasMany(RiskActionLink::class, 'risk_id');
    }
}

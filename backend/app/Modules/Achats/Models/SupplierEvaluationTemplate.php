<?php

declare(strict_types=1);

namespace App\Modules\Achats\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierEvaluationTemplate extends Model
{
    protected $table = 'supplier_evaluation_templates';

    protected $fillable = [
        'officine_id',
        'code',
        'title',
        'supplier_type',
        'criteria',
        'is_active',
        'version',
    ];

    protected $casts = [
        'criteria' => 'array',
        'is_active' => 'boolean',
        'version' => 'integer',
    ];

    public function evaluations(): HasMany
    {
        return $this->hasMany(SupplierEvaluation::class, 'template_id');
    }
}

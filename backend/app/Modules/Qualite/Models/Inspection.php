<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Inspection extends Model
{
    protected $table = 'inspections';

    protected $fillable = [
        'officine_id',
        'program_id',
        'reference',
        'title',
        'process_scope',
        'scope_description',
        'objective',
        'planned_date',
        'realized_date',
        'lead_inspector_id',
        'status',
        'version',
        'created_by',
    ];

    protected $casts = [
        'planned_date' => 'date',
        'realized_date' => 'date',
        'version' => 'integer',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(InspectionProgram::class, 'program_id');
    }

    public function leadInspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lead_inspector_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function inspectors(): HasMany
    {
        return $this->hasMany(InspectionInspector::class, 'inspection_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InspectionItem::class, 'inspection_id')->orderBy('sort_order');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(InspectionResponse::class, 'inspection_id');
    }

    public function report(): HasOne
    {
        return $this->hasOne(InspectionReport::class, 'inspection_id');
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(InspectorEvaluation::class, 'inspection_id');
    }

    public function actionLinks(): HasMany
    {
        return $this->hasMany(InspectionActionLink::class, 'inspection_id');
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\LocauxEquipements\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CleaningPlan extends Model
{
    protected $table = 'cleaning_plans';

    protected $fillable = [
        'officine_id',
        'zone_name',
        'frequency',
        'cleaning_method',
        'products_used',
        'assigned_role',
        'is_active',
        'version',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'version' => 'integer',
    ];

    public function occurrences(): HasMany
    {
        return $this->hasMany(CleaningOccurrence::class, 'cleaning_plan_id');
    }
}

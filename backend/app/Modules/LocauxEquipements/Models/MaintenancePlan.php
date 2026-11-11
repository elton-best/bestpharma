<?php

declare(strict_types=1);

namespace App\Modules\LocauxEquipements\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MaintenancePlan extends Model
{
    protected $table = 'maintenance_plans';

    protected $fillable = [
        'officine_id',
        'equipment_id',
        'maintenance_type',
        'frequency_days',
        'last_performed_at',
        'next_due_date',
        'default_provider_name',
        'instructions',
        'is_active',
        'version',
    ];

    protected $casts = [
        'frequency_days' => 'integer',
        'last_performed_at' => 'date:Y-m-d',
        'next_due_date' => 'date:Y-m-d',
        'is_active' => 'boolean',
        'version' => 'integer',
    ];

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(MaintenanceEvent::class, 'maintenance_plan_id');
    }
}

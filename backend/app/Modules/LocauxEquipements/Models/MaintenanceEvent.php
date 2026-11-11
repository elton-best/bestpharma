<?php

declare(strict_types=1);

namespace App\Modules\LocauxEquipements\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceEvent extends Model
{
    protected $table = 'maintenance_events';

    protected $fillable = [
        'officine_id',
        'equipment_id',
        'maintenance_plan_id',
        'intervention_type',
        'intervention_date',
        'provider_name',
        'technician_name',
        'description',
        'result',
        'next_due_date',
        'cost',
        'report_document_id',
        'is_verified',
        'verified_by_user_id',
        'verified_at',
        'created_action_id',
        'version',
    ];

    protected $casts = [
        'intervention_date' => 'date:Y-m-d',
        'next_due_date' => 'date:Y-m-d',
        'cost' => 'float',
        'is_verified' => 'boolean',
        'verified_at' => 'datetime',
        'version' => 'integer',
    ];

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(MaintenancePlan::class, 'maintenance_plan_id');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by_user_id');
    }
}

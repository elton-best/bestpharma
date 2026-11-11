<?php

declare(strict_types=1);

namespace App\Modules\LocauxEquipements\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Equipment extends Model
{
    protected $table = 'equipments';

    protected $fillable = [
        'officine_id',
        'code',
        'designation',
        'category',
        'brand',
        'model',
        'serial_number',
        'acquisition_year',
        'installation_date',
        'current_location_id',
        'status',
        'criticality',
        'notes',
        'version',
    ];

    protected $casts = [
        'acquisition_year' => 'integer',
        'installation_date' => 'date:Y-m-d',
        'version' => 'integer',
    ];

    public function location(): BelongsTo
    {
        return $this->belongsTo(EquipmentLocation::class, 'current_location_id');
    }

    public function locationHistories(): HasMany
    {
        return $this->hasMany(EquipmentLocationHistory::class, 'equipment_id');
    }

    public function commissioningTests(): HasMany
    {
        return $this->hasMany(CommissioningTest::class, 'equipment_id');
    }

    public function maintenancePlans(): HasMany
    {
        return $this->hasMany(MaintenancePlan::class, 'equipment_id');
    }

    public function maintenanceEvents(): HasMany
    {
        return $this->hasMany(MaintenanceEvent::class, 'equipment_id');
    }

    public function generatorTests(): HasMany
    {
        return $this->hasMany(GeneratorTest::class, 'equipment_id');
    }

    public function withdrawals(): HasMany
    {
        return $this->hasMany(EquipmentWithdrawal::class, 'equipment_id');
    }
}

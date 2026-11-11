<?php

declare(strict_types=1);

namespace App\Modules\Stock\Models;

use App\Models\User;
use App\Modules\LocauxEquipements\Models\Equipment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TemperatureReading extends Model
{
    protected $table = 'temperature_readings';

    protected $fillable = [
        'officine_id',
        'equipment_id',
        'zone_name',
        'measured_temperature',
        'min_threshold',
        'max_threshold',
        'is_excursion',
        'measured_at',
        'recorded_by_user_id',
        'incident_notes',
        'pharmacist_decision',
        'effectiveness_status',
        'created_action_id',
        'version',
    ];

    protected $casts = [
        'measured_temperature' => 'float',
        'min_threshold' => 'float',
        'max_threshold' => 'float',
        'is_excursion' => 'boolean',
        'measured_at' => 'datetime',
        'version' => 'integer',
    ];

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by_user_id');
    }
}

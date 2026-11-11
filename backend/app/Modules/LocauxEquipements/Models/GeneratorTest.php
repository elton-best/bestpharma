<?php

declare(strict_types=1);

namespace App\Modules\LocauxEquipements\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeneratorTest extends Model
{
    protected $table = 'generator_tests';

    protected $fillable = [
        'officine_id',
        'equipment_id',
        'test_date',
        'tested_by_user_id',
        'fuel_level_percent',
        'start_delay_seconds',
        'oil_level_ok',
        'battery_voltage_ok',
        'frequency_hz',
        'test_result',
        'comment',
        'created_action_id',
        'version',
    ];

    protected $casts = [
        'test_date' => 'date:Y-m-d',
        'fuel_level_percent' => 'float',
        'start_delay_seconds' => 'integer',
        'oil_level_ok' => 'boolean',
        'battery_voltage_ok' => 'boolean',
        'frequency_hz' => 'float',
        'version' => 'integer',
    ];

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
    }

    public function testedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'tested_by_user_id');
    }
}

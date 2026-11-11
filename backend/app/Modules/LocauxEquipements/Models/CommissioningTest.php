<?php

declare(strict_types=1);

namespace App\Modules\LocauxEquipements\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommissioningTest extends Model
{
    protected $table = 'commissioning_tests';

    protected $fillable = [
        'officine_id',
        'equipment_id',
        'test_date',
        'conducted_by_user_id',
        'electrical_safety_checked',
        'functional_test_passed',
        'temperature_conformity_passed',
        'calibration_checked',
        'staff_trained',
        'decision',
        'notes',
        'version',
    ];

    protected $casts = [
        'test_date' => 'date:Y-m-d',
        'electrical_safety_checked' => 'boolean',
        'functional_test_passed' => 'boolean',
        'temperature_conformity_passed' => 'boolean',
        'calibration_checked' => 'boolean',
        'staff_trained' => 'boolean',
        'version' => 'integer',
    ];

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
    }

    public function conductedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'conducted_by_user_id');
    }
}

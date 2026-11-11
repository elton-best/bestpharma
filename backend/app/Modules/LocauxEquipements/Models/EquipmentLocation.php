<?php

declare(strict_types=1);

namespace App\Modules\LocauxEquipements\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EquipmentLocation extends Model
{
    protected $table = 'equipment_locations';

    protected $fillable = [
        'officine_id',
        'name',
        'description',
        'is_active',
        'version',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'version' => 'integer',
    ];

    public function equipments(): HasMany
    {
        return $this->hasMany(Equipment::class, 'current_location_id');
    }
}

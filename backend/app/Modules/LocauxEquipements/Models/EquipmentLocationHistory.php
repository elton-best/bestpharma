<?php

declare(strict_types=1);

namespace App\Modules\LocauxEquipements\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EquipmentLocationHistory extends Model
{
    protected $table = 'equipment_location_histories';

    protected $fillable = [
        'officine_id',
        'equipment_id',
        'location_id',
        'moved_at',
        'moved_by_user_id',
        'reason',
    ];

    protected $casts = [
        'moved_at' => 'datetime',
    ];

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(EquipmentLocation::class, 'location_id');
    }

    public function movedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moved_by_user_id');
    }
}

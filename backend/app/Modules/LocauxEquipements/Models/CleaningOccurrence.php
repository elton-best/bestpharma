<?php

declare(strict_types=1);

namespace App\Modules\LocauxEquipements\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CleaningOccurrence extends Model
{
    protected $table = 'cleaning_occurrences';

    protected $fillable = [
        'officine_id',
        'cleaning_plan_id',
        'planned_date',
        'performed_at',
        'performed_by_user_id',
        'status',
        'is_verified',
        'verified_by_user_id',
        'verified_at',
        'anomalies_detected',
        'created_action_id',
        'version',
    ];

    protected $casts = [
        'planned_date' => 'date:Y-m-d',
        'performed_at' => 'datetime',
        'is_verified' => 'boolean',
        'verified_at' => 'datetime',
        'version' => 'integer',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(CleaningPlan::class, 'cleaning_plan_id');
    }

    public function performedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by_user_id');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by_user_id');
    }
}

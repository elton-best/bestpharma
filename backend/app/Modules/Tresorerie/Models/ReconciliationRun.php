<?php

declare(strict_types=1);

namespace App\Modules\Tresorerie\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReconciliationRun extends Model
{
    protected $table = 'reconciliation_runs';

    protected $fillable = [
        'officine_id',
        'reference',
        'period_date',
        'total_expected',
        'total_declared',
        'total_variance',
        'status',
        'created_by_user_id',
        'closed_by_user_id',
        'closed_at',
        'created_action_id',
        'version',
    ];

    protected $casts = [
        'total_expected' => 'float',
        'total_declared' => 'float',
        'total_variance' => 'float',
        'closed_at' => 'datetime',
        'version' => 'integer',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(ReconciliationLine::class, 'reconciliation_run_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by_user_id');
    }
}

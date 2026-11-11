<?php

declare(strict_types=1);

namespace App\Modules\Tresorerie\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashRegister extends Model
{
    protected $table = 'cash_registers';

    protected $fillable = [
        'officine_id',
        'code',
        'name',
        'location_label',
        'discrepancy_alert_threshold',
        'is_active',
        'version',
    ];

    protected $casts = [
        'discrepancy_alert_threshold' => 'float',
        'is_active' => 'boolean',
        'version' => 'integer',
    ];

    public function sessions(): HasMany
    {
        return $this->hasMany(CashSession::class, 'cash_register_id');
    }
}

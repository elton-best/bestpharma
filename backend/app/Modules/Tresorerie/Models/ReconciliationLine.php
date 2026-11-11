<?php

declare(strict_types=1);

namespace App\Modules\Tresorerie\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReconciliationLine extends Model
{
    protected $table = 'reconciliation_lines';

    protected $fillable = [
        'officine_id',
        'reconciliation_run_id',
        'payment_method',
        'expected_amount',
        'declared_amount',
        'variance_amount',
        'justification',
    ];

    protected $casts = [
        'expected_amount' => 'float',
        'declared_amount' => 'float',
        'variance_amount' => 'float',
    ];

    public function run(): BelongsTo
    {
        return $this->belongsTo(ReconciliationRun::class, 'reconciliation_run_id');
    }
}

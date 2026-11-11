<?php

declare(strict_types=1);

namespace App\Modules\Personnel\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveBalance extends Model
{
    protected $table = 'leave_balances';

    protected $fillable = [
        'officine_id',
        'employee_id',
        'year',
        'acquired_days',
        'taken_days',
        'remaining_days',
        'version',
    ];

    protected $casts = [
        'year' => 'integer',
        'acquired_days' => 'float',
        'taken_days' => 'float',
        'remaining_days' => 'float',
        'version' => 'integer',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}

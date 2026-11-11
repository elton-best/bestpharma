<?php

declare(strict_types=1);

namespace App\Modules\Personnel\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Shift extends Model
{
    protected $table = 'shifts';

    protected $fillable = [
        'officine_id',
        'employee_id',
        'shift_type',
        'shift_date',
        'start_time',
        'end_time',
        'status',
        'replaced_by_employee_id',
        'notes',
        'version',
    ];

    protected $casts = [
        'shift_date' => 'date:Y-m-d',
        'version' => 'integer',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function replacement(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'replaced_by_employee_id');
    }
}

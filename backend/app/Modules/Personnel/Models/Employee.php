<?php

declare(strict_types=1);

namespace App\Modules\Personnel\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Model
{
    protected $table = 'employees';

    protected $fillable = [
        'officine_id',
        'user_id',
        'matricule',
        'first_name',
        'last_name',
        'email',
        'phone',
        'role_title',
        'contract_type',
        'hire_date',
        'status',
        'ordre_b_number',
        'ordre_b_expiry',
        'qualifications',
        'emergency_contact',
        'version',
    ];

    protected $casts = [
        'hire_date' => 'date:Y-m-d',
        'ordre_b_expiry' => 'date:Y-m-d',
        'qualifications' => 'array',
        'version' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function leaveBalances(): HasMany
    {
        return $this->hasMany(LeaveBalance::class, 'employee_id');
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class, 'employee_id');
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(Shift::class, 'employee_id');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(TrainingAttendance::class, 'employee_id');
    }

    public function performanceReviews(): HasMany
    {
        return $this->hasMany(PerformanceReview::class, 'employee_id');
    }
}

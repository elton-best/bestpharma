<?php

declare(strict_types=1);

namespace App\Modules\Paie\Models;

use App\Models\User;
use App\Modules\Personnel\Models\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaieBulletin extends Model
{
    protected $table = 'paie_bulletins';

    protected $fillable = [
        'officine_id',
        'employee_id',
        'bareme_id',
        'period_month',
        'reference',
        'idempotency_key',
        'gross_salary',
        'cnss_employee',
        'cnss_employer',
        'its_tax',
        'net_salary',
        'status',
        'validated_by_user_id',
        'validated_at',
        'bulletin_hash',
        'version',
    ];

    protected $casts = [
        'gross_salary' => 'float',
        'cnss_employee' => 'float',
        'cnss_employer' => 'float',
        'its_tax' => 'float',
        'net_salary' => 'float',
        'validated_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function bareme(): BelongsTo
    {
        return $this->belongsTo(PaieBareme::class, 'bareme_id');
    }

    public function validatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by_user_id');
    }
}

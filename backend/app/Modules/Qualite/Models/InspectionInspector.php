<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InspectionInspector extends Model
{
    protected $table = 'inspection_inspectors';

    protected $fillable = [
        'inspection_id',
        'user_id',
        'role',
        'regular_service',
        'conflict_check_passed',
        'conflict_notes',
    ];

    protected $casts = [
        'conflict_check_passed' => 'boolean',
    ];

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(Inspection::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InspectionProgram extends Model
{
    protected $table = 'inspection_programs';

    protected $fillable = [
        'officine_id',
        'title',
        'year_start',
        'year_end',
        'objective',
        'status',
        'version',
        'created_by',
    ];

    protected $casts = [
        'year_start' => 'integer',
        'year_end' => 'integer',
        'version' => 'integer',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function inspections(): HasMany
    {
        return $this->hasMany(Inspection::class, 'program_id');
    }
}

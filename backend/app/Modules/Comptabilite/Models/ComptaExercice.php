<?php

declare(strict_types=1);

namespace App\Modules\Comptabilite\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ComptaExercice extends Model
{
    protected $table = 'compta_exercices';

    protected $fillable = [
        'officine_id',
        'code',
        'label',
        'start_date',
        'end_date',
        'status',
        'closed_at',
        'closed_by_user_id',
        'version',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'closed_at' => 'datetime',
    ];

    public function ecritures(): HasMany
    {
        return $this->hasMany(ComptaEcriture::class, 'exercice_id');
    }
}

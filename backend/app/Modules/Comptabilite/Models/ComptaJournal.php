<?php

declare(strict_types=1);

namespace App\Modules\Comptabilite\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ComptaJournal extends Model
{
    protected $table = 'compta_journaux';

    protected $fillable = [
        'officine_id',
        'code',
        'name',
        'journal_type',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function ecritures(): HasMany
    {
        return $this->hasMany(ComptaEcriture::class, 'journal_id');
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Comptabilite\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ComptaCompte extends Model
{
    protected $table = 'compta_comptes';

    protected $fillable = [
        'officine_id',
        'code',
        'label',
        'classe',
        'nature',
        'is_active',
    ];

    protected $casts = [
        'classe' => 'integer',
        'is_active' => 'boolean',
    ];

    public function lignes(): HasMany
    {
        return $this->hasMany(ComptaEcritureLigne::class, 'compte_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Prescripteur extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'prescripteurs';

    protected $fillable = [
        'officine_id',
        'nom_complet',
        'titre',
        'specialite',
        'numero_ordre',
        'centre_sante',
        'telephone',
        'email',
        'ville',
        'actif',
    ];

    protected $casts = [
        'actif' => 'boolean',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function ordonnances(): HasMany
    {
        return $this->hasMany(Ordonnance::class);
    }
}

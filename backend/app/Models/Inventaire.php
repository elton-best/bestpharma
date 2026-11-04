<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Inventaire extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'inventaires';

    protected $fillable = [
        'officine_id',
        'reference',
        'type',
        'zone',
        'statut',
        'date_inventaire',
        'initiateur_id',
        'validateur_id',
        'date_validation',
        'Parametres',
    ];

    protected $casts = [
        'date_inventaire' => 'date',
        'date_validation' => 'datetime',
        'Parametres' => 'array',
    ];

    public function officine(): BelongsTo { return $this->belongsTo(Officine::class); }
    public function initiateur(): BelongsTo { return $this->belongsTo(User::class, 'initiateur_id'); }
    public function validateur(): BelongsTo { return $this->belongsTo(User::class, 'validateur_id'); }
    public function lignes(): HasMany { return $this->hasMany(LigneInventaire::class, 'inventaire_id'); }
}

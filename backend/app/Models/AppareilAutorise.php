<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppareilAutorise extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'appareils_autorises';

    protected $fillable = [
        'officine_id',
        'nom_appareil',
        'identifiant_unique',
        'type_appareil',
        'est_borne_pointage',
        'actif',
        'derniere_activite',
        'enregistre_par',
        'archived',
    ];

    protected function casts(): array
    {
        return [
            'est_borne_pointage' => 'boolean',
            'actif' => 'boolean',
            'archived' => 'boolean',
            'derniere_activite' => 'datetime',
        ];
    }

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }
}

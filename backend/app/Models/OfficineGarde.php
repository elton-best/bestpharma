<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfficineGarde extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'officines_gardes';

    protected $fillable = [
        'officine_id',
        'nom_officine',
        'commune',
        'zone_quartier',
        'telephone',
        'date_debut',
        'date_fin',
        'est_garde_active',
        'commentaires',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date_debut' => 'datetime',
            'date_fin' => 'datetime',
            'est_garde_active' => 'boolean',
        ];
    }

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

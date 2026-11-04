<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Fichier extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'fichiers';

    protected $fillable = [
        'officine_id',
        'objet_type',
        'objet_id',
        'nom_original',
        'nom_stocke',
        'mime_type',
        'taille_octets',
        'sha256',
        'chemin',
        'chiffre',
        'version',
        'auteur_id',
        'date_conservation_jusqua',
    ];

    protected $casts = [
        'taille_octets' => 'integer',
        'chiffre' => 'boolean',
        'version' => 'integer',
        'date_conservation_jusqua' => 'datetime',
    ];

    public function officine(): BelongsTo { return $this->belongsTo(Officine::class); }
    public function auteur(): BelongsTo { return $this->belongsTo(User::class, 'auteur_id'); }
}

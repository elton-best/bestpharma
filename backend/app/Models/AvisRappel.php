<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AvisRappel extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'avis_rappels';

    protected $fillable = [
        'officine_id',
        'reference',
        'source',
        'produits_concernes',
        'lots_concernes',
        'date_avis',
        'action_requise',
        'statut',
        'pieces_jointes',
        'auteur_id',
        'cloture_par_id',
        'date_cloture',
        'preuve_cloture',
    ];

    protected $casts = [
        'date_avis' => 'date',
        'date_cloture' => 'datetime',
        'lots_concernes' => 'array',
        'pieces_jointes' => 'array',
    ];

    public function officine(): BelongsTo { return $this->belongsTo(Officine::class); }
    public function auteur(): BelongsTo { return $this->belongsTo(User::class, 'auteur_id'); }
}

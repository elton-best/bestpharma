<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LotDechet extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'lots_dechets';

    protected $fillable = [
        'officine_id',
        'reference',
        'motif',
        'lots_originels',
        'quantite_totale',
        'valeur_perte',
        'zone_stockage',
        'statut',
        'prestataire_nom',
        'date_destruction_prevue',
        'date_destruction_reelle',
        'pv_url',
        'certificat_url',
        'constitue_par_id',
        'detruit_par_id',
    ];

    protected $casts = [
        'lots_originels' => 'array',
        'quantite_totale' => 'integer',
        'valeur_perte' => 'decimal:2',
        'date_destruction_prevue' => 'date',
        'date_destruction_reelle' => 'date',
    ];

    public function officine(): BelongsTo { return $this->belongsTo(Officine::class); }
    public function constituePar(): BelongsTo { return $this->belongsTo(User::class, 'constitue_par_id'); }
}

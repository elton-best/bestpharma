<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransfertInterOfficine extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'transferts_inter_officines';

    protected $fillable = [
        'numero_transfert',
        'officine_source_id',
        'officine_destinataire_id',
        'statut',
        'motif',
        'demandeur_id',
        'valide_par_id',
        'expedie_a',
        'receptionne_a',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'expedie_a' => 'datetime',
            'receptionne_a' => 'datetime',
        ];
    }

    public function officineSource(): BelongsTo
    {
        return $this->belongsTo(Officine::class, 'officine_source_id');
    }

    public function officineDestinataire(): BelongsTo
    {
        return $this->belongsTo(Officine::class, 'officine_destinataire_id');
    }

    public function demandeur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'demandeur_id');
    }

    public function validateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valide_par_id');
    }

    public function lignes(): HasMany
    {
        return $this->hasMany(LigneTransfertInterOfficine::class, 'transfert_id');
    }
}

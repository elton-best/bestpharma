<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EquipementOfficine extends Model
{
    use HasUuids;

    protected $table = 'equipements_officine';

    protected $fillable = [
        'officine_id',
        'code_interne',
        'designation',
        'categorie',
        'marque_modele',
        'numero_serie',
        'emplacement',
        'date_acquisition',
        'periodicite_etalonnage_mois',
        'date_dernier_etalonnage',
        'date_prochain_etalonnage',
        'statut',
        'certificat_ref',
        'notes',
    ];

    protected $casts = [
        'date_acquisition' => 'date',
        'date_dernier_etalonnage' => 'date',
        'date_prochain_etalonnage' => 'date',
        'periodicite_etalonnage_mois' => 'integer',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }
}

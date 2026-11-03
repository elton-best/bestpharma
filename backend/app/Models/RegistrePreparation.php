<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistrePreparation extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'registre_preparations';

    protected $fillable = [
        'officine_id',
        'numero_preparation',
        'nom_preparation',
        'type_preparation',
        'formule_detaillee',
        'matieres_premieres_lots',
        'quantite_produite',
        'conditionnement',
        'date_fabrication',
        'date_limite_utilisation',
        'patient_nom',
        'prescripteur_nom',
        'executant_id',
        'pharmacien_visa_id',
        'date_visa',
        'conforme',
        'controles_effectues',
    ];

    protected $casts = [
        'matieres_premieres_lots' => 'array',
        'date_fabrication' => 'date',
        'date_limite_utilisation' => 'date',
        'date_visa' => 'datetime',
        'conforme' => 'boolean',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function executant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'executant_id');
    }

    public function pharmacienVisa(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pharmacien_visa_id');
    }
}

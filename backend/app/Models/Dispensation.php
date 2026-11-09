<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Dispensation extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'dispensations';

    protected $fillable = [
        'officine_id',
        'numero_dispensation',
        'type_dispensation',
        'patient_id',
        'ordonnance_id',
        'prescripteur_id',
        'patient_nom',
        'patient_age',
        'patient_telephone',
        'prescripteur_nom',
        'prescripteur_titre',
        'prescripteur_centre',
        'date_ordonnance',
        'montant_total',
        'statut',
        'dispensateur_id',
        'pharmacien_id',
        'commentaires_posologie',
        'alertes_detectees',
    ];

    protected $casts = [
        'patient_age' => 'integer',
        'date_ordonnance' => 'date',
        'montant_total' => 'decimal:2',
        'alertes_detectees' => 'array',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function ordonnance(): BelongsTo
    {
        return $this->belongsTo(Ordonnance::class);
    }

    public function prescripteur(): BelongsTo
    {
        return $this->belongsTo(Prescripteur::class);
    }

    public function dispensateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dispensateur_id');
    }

    public function pharmacien(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pharmacien_id');
    }

    public function lignes(): HasMany
    {
        return $this->hasMany(LigneDispensation::class);
    }
}

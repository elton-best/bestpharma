<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ordonnance extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'ordonnances';

    protected $fillable = [
        'officine_id',
        'numero_ordonnance',
        'patient_id',
        'prescripteur_id',
        'prescripteur_nom_libre',
        'prescripteur_centre_libre',
        'date_prescription',
        'date_expiration',
        'duree_traitement_jours',
        'nombre_renouvellements_autorises',
        'nombre_renouvellements_effectues',
        'statut',
        'scan_ordonnance_path',
        'scan_sha256',
        'diagnostic_presume',
        'lignes_prescrites',
        'commentaires_pharmacien',
    ];

    protected $casts = [
        'date_prescription' => 'date',
        'date_expiration' => 'date',
        'duree_traitement_jours' => 'integer',
        'nombre_renouvellements_autorises' => 'integer',
        'nombre_renouvellements_effectues' => 'integer',
        'lignes_prescrites' => 'array',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function prescripteur(): BelongsTo
    {
        return $this->belongsTo(Prescripteur::class);
    }

    public function dispensations(): HasMany
    {
        return $this->hasMany(Dispensation::class)->orderByDesc('created_at');
    }

    /**
     * Détermine si l'ordonnance est éligible à un renouvellement (BPD Art. 7.18)
     */
    public function peutEtreRenouvelee(): array
    {
        if ($this->statut !== 'active') {
            return ['eligible' => false, 'motif' => "L'ordonnance est au statut {$this->statut}."];
        }

        if ($this->date_expiration && Carbon::now()->isAfter($this->date_expiration)) {
            return ['eligible' => false, 'motif' => "L'ordonnance a expiré le {$this->date_expiration->format('d/m/Y')}."];
        }

        if ($this->nombre_renouvellements_effectues >= $this->nombre_renouvellements_autorises) {
            return [
                'eligible' => false,
                'motif' => "Quota de renouvellements atteint ({$this->nombre_renouvellements_effectues}/{$this->nombre_renouvellements_autorises}).",
            ];
        }

        return ['eligible' => true, 'motif' => 'Éligible au renouvellement.'];
    }
}

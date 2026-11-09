<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Patient extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'patients';

    protected $fillable = [
        'officine_id',
        'code_patient',
        'nom',
        'prenom',
        'sexe',
        'date_naissance',
        'age',
        'telephone',
        'email',
        'adresse',
        'ville',
        'groupe_sanguin',
        'poids_kg',
        'taille_cm',
        'est_enceinte',
        'est_allaitante',
        'pathologies_chroniques',
        'allergies_declarees',
        'notes_cliniques',
        'consentement_dp',
        'actif',
    ];

    protected $casts = [
        'date_naissance' => 'date',
        'age' => 'integer',
        'poids_kg' => 'decimal:2',
        'taille_cm' => 'decimal:2',
        'est_enceinte' => 'boolean',
        'est_allaitante' => 'boolean',
        'consentement_dp' => 'boolean',
        'actif' => 'boolean',
        'pathologies_chroniques' => 'array',
        'allergies_declarees' => 'array',
    ];

    protected static function booted(): void
    {
        static::saving(function (Patient $patient) {
            if ($patient->date_naissance && ! $patient->age) {
                $patient->age = Carbon::parse($patient->date_naissance)->age;
            }
        });
    }

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function ordonnances(): HasMany
    {
        return $this->hasMany(Ordonnance::class)->orderByDesc('date_prescription');
    }

    public function dispensations(): HasMany
    {
        return $this->hasMany(Dispensation::class)->orderByDesc('created_at');
    }

    /**
     * Calcule l'historique thérapeutique unifié du patient (traçabilité BPD art. 7.1)
     */
    public function historiqueTherapeutique(): array
    {
        $dispensations = $this->dispensations()
            ->with(['lignes.produit', 'lignes.lot', 'dispensateur'])
            ->get();

        $historique = [];
        foreach ($dispensations as $disp) {
            foreach ($disp->lignes as $ligne) {
                $historique[] = [
                    'dispensation_id' => $disp->id,
                    'numero_dispensation' => $disp->numero_dispensation,
                    'date_dispensation' => $disp->created_at->format('Y-m-d H:i'),
                    'produit_id' => $ligne->produit_id,
                    'nom_commercial' => $ligne->produit->nom_commercial ?? 'N/A',
                    'dci' => $ligne->produit->dci ?? null,
                    'dosage' => $ligne->produit->dosage ?? null,
                    'forme' => $ligne->produit->forme ?? null,
                    'numero_lot' => $ligne->lot->numero_lot ?? null,
                    'date_peremption' => $ligne->lot->date_peremption ?? null,
                    'quantite' => $ligne->quantite,
                    'posologie' => $ligne->posologie,
                    'duree_traitement' => $ligne->duree_traitement,
                    'dispensateur' => $disp->dispensateur->name ?? 'Inconnu',
                ];
            }
        }

        return $historique;
    }
}

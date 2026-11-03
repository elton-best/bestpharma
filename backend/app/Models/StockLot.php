<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockLot extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'stocks_lots';

    protected $fillable = [
        'officine_id',
        'produit_id',
        'numero_lot',
        'date_fabrication',
        'date_peremption',
        'quantite_initiale',
        'quantite_disponible',
        'emplacement',
        'prix_achat_unitaire',
        'fournisseur_nom',
        'bon_livraison_ref',
        'statut',
        'motif_quarantaine',
    ];

    protected $casts = [
        'date_fabrication' => 'date',
        'date_peremption' => 'date',
        'quantite_initiale' => 'integer',
        'quantite_disponible' => 'integer',
        'prix_achat_unitaire' => 'decimal:2',
    ];

    protected $appends = [
        'jours_avant_peremption',
        'statut_peremption',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function produit(): BelongsTo
    {
        return $this->belongsTo(Produit::class);
    }

    public function lignesDispensation(): HasMany
    {
        return $this->hasMany(LigneDispensation::class);
    }

    /**
     * Calcul des jours restants avant la date limite d'utilisation
     */
    public function getJoursAvantPeremptionAttribute(): int
    {
        if (!$this->date_peremption) {
            return 9999;
        }
        return (int) Carbon::now()->startOfDay()->diffInDays(Carbon::parse($this->date_peremption)->startOfDay(), false);
    }

    /**
     * Niveau d'alerte de péremption (BPD Art. 5.12)
     */
    public function getStatutPeremptionAttribute(): string
    {
        $jours = $this->jours_avant_peremption;
        if ($jours < 0) {
            return 'perime';
        }
        if ($jours <= 30) {
            return 'critique_1m'; // Alerte rouge < 1 mois
        }
        if ($jours <= 90) {
            return 'alerte_3m'; // Alerte orange < 3 mois
        }
        if ($jours <= 180) {
            return 'attention_6m'; // Alerte jaune < 6 mois
        }
        return 'normal';
    }
}

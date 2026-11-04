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
        'date_reception',
        'quantite_initiale',
        'quantite_disponible',
        'emplacement',
        'emplacement_id',
        'prix_achat_unitaire',
        'cout_achat_total',
        'fournisseur_nom',
        'fournisseur_agrement',
        'bon_livraison_ref',
        'statut',
        'statut_detail',
        'motif_quarantaine',
        'motif_statut',
        'dernier_modificateur_id',
        'date_changement_statut',
        'pieces_jointes',
        'controles_reception',
    ];

    protected $casts = [
        'date_fabrication' => 'date',
        'date_peremption' => 'date',
        'date_reception' => 'date',
        'date_changement_statut' => 'datetime',
        'quantite_initiale' => 'integer',
        'quantite_disponible' => 'integer',
        'prix_achat_unitaire' => 'decimal:2',
        'cout_achat_total' => 'decimal:2',
        'pieces_jointes' => 'array',
        'controles_reception' => 'array',
    ];

    protected $appends = [
        'jours_avant_peremption',
        'statut_peremption',
        'statut_effectif',
        'est_vendable',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function produit(): BelongsTo
    {
        return $this->belongsTo(Produit::class);
    }

    public function emplacementRef(): BelongsTo
    {
        return $this->belongsTo(Emplacement::class, 'emplacement_id');
    }

    public function dernierModificateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dernier_modificateur_id');
    }

    public function mouvements(): HasMany
    {
        return $this->hasMany(MouvementStock::class, 'stock_lot_id');
    }

    public function lignesDispensation(): HasMany
    {
        return $this->hasMany(LigneDispensation::class);
    }

    // Statut effectif (nouveau système 8 statuts, rétrocompat ancien)
    public function getStatutEffectifAttribute(): string
    {
        if ($this->statut_detail) return $this->statut_detail;
        // rétrocompat
        return match ($this->statut) {
            'en_stock' => 'commercialisable',
            'quarantaine' => 'quarantaine',
            'retire' => 'rejete',
            default => $this->statut,
        };
    }

    public function getEstVendableAttribute(): bool
    {
        return $this->statut_effectif === 'commercialisable' && $this->quantite_disponible > 0 && $this->jours_avant_peremption >= 0;
    }

    public const STATUTS = ['commercialisable','en_attente_controle','a_evaluer','quarantaine','attente_retour','rejete','dechet','epuise'];
    public const STATUTS_VENDABLES = ['commercialisable'];

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

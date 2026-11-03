<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Produit extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'produits';

    protected $fillable = [
        'officine_id',
        'code_cip',
        'nom_commercial',
        'dci',
        'forme',
        'dosage',
        'classe_therapeutique',
        'tableau_substance',
        'est_thermolabile',
        'necessite_ordonnance',
        'prix_achat_ht',
        'prix_public_ttc',
        'seuil_stock_min',
        'seuil_stock_securite',
    ];

    protected $casts = [
        'est_thermolabile' => 'boolean',
        'necessite_ordonnance' => 'boolean',
        'prix_achat_ht' => 'decimal:2',
        'prix_public_ttc' => 'decimal:2',
        'seuil_stock_min' => 'integer',
        'seuil_stock_securite' => 'integer',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function lots(): HasMany
    {
        return $this->hasMany(StockLot::class);
    }

    /**
     * Lots valides et disponibles classés selon la règle stricte FEFO (First Expired, First Out)
     */
    public function lotsFefo(): HasMany
    {
        return $this->hasMany(StockLot::class)
            ->where('statut', 'en_stock')
            ->where('quantite_disponible', '>', 0)
            ->orderBy('date_peremption', 'asc');
    }
}

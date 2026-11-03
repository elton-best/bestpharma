<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LigneVente extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'lignes_vente';

    protected $fillable = [
        'vente_id',
        'produit_id',
        'stock_lot_id',
        'quantite',
        'prix_unitaire_ttc',
        'taux_tva',
        'groupe_taxation',
        'total_ligne',
    ];

    protected $casts = [
        'quantite' => 'integer',
        'prix_unitaire_ttc' => 'decimal:2',
        'taux_tva' => 'decimal:2',
        'total_ligne' => 'decimal:2',
    ];

    public function vente(): BelongsTo
    {
        return $this->belongsTo(VenteCaisse::class, 'vente_id');
    }

    public function produit(): BelongsTo
    {
        return $this->belongsTo(Produit::class);
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(StockLot::class, 'stock_lot_id');
    }
}

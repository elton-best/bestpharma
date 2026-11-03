<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LigneDispensation extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'lignes_dispensation';

    protected $fillable = [
        'dispensation_id',
        'produit_id',
        'stock_lot_id',
        'quantite',
        'prix_unitaire',
        'montant_ligne',
        'posologie',
        'duree_traitement',
    ];

    protected $casts = [
        'quantite' => 'integer',
        'prix_unitaire' => 'decimal:2',
        'montant_ligne' => 'decimal:2',
    ];

    public function dispensation(): BelongsTo
    {
        return $this->belongsTo(Dispensation::class);
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

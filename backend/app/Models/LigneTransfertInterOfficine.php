<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LigneTransfertInterOfficine extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'lignes_transferts_inter_officines';

    protected $fillable = [
        'transfert_id',
        'produit_id',
        'stock_lot_source_id',
        'numero_lot',
        'date_peremption',
        'quantite',
        'prix_unitaire_achat',
    ];

    protected function casts(): array
    {
        return [
            'date_peremption' => 'date',
            'quantite' => 'integer',
            'prix_unitaire_achat' => 'decimal:2',
        ];
    }

    public function transfert(): BelongsTo
    {
        return $this->belongsTo(TransfertInterOfficine::class, 'transfert_id');
    }

    public function produit(): BelongsTo
    {
        return $this->belongsTo(Produit::class);
    }

    public function stockLotSource(): BelongsTo
    {
        return $this->belongsTo(StockLot::class, 'stock_lot_source_id');
    }
}

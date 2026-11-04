<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LigneInventaire extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'lignes_inventaire';

    protected $fillable = [
        'inventaire_id',
        'produit_id',
        'stock_lot_id',
        'quantite_theorique',
        'quantite_comptee',
        'ecart',
        'valorisation_ecart',
        'commentaire',
        'compteur_id',
    ];

    protected $casts = [
        'quantite_theorique' => 'integer',
        'quantite_comptee' => 'integer',
        'ecart' => 'integer',
        'valorisation_ecart' => 'decimal:2',
    ];

    public function inventaire(): BelongsTo { return $this->belongsTo(Inventaire::class, 'inventaire_id'); }
    public function produit(): BelongsTo { return $this->belongsTo(Produit::class); }
    public function lot(): BelongsTo { return $this->belongsTo(StockLot::class, 'stock_lot_id'); }
    public function compteur(): BelongsTo { return $this->belongsTo(User::class, 'compteur_id'); }
}

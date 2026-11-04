<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArmoireContenu extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'armoire_contenu';

    protected $fillable = [
        'officine_id',
        'produit_id',
        'stock_lot_id',
        'quantite',
        'emplacement_code',
        'derniere_verif',
        'verifie_par_id',
    ];

    protected $casts = [
        'quantite' => 'integer',
        'derniere_verif' => 'datetime',
    ];

    public function officine(): BelongsTo { return $this->belongsTo(Officine::class); }
    public function produit(): BelongsTo { return $this->belongsTo(Produit::class); }
    public function lot(): BelongsTo { return $this->belongsTo(StockLot::class, 'stock_lot_id'); }
}

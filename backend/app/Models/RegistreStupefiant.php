<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistreStupefiant extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'registre_stupefiants';

    protected $fillable = [
        'officine_id',
        'numero_ordre',
        'date_mouvement',
        'type_mouvement',
        'categorie',
        'produit_id',
        'stock_lot_id',
        'quantite',
        'stock_precedent',
        'stock_nouveau',
        'reference_piece',
        'tiers_nom',
        'patient_nom',
        'patient_telephone',
        'prescripteur_nom',
        'ordonnance_id',
        'operateur_id',
        'pharmacien_visa_id',
        'date_visa',
        'observations',
        'declaration_vol_ref',
        'autorisation_destruction_ref',
        'pieces_jointes',
        'est_ordonnancier',
        'date_ecart_detecte',
    ];

    protected $casts = [
        'numero_ordre' => 'integer',
        'date_mouvement' => 'datetime',
        'date_visa' => 'datetime',
        'date_ecart_detecte' => 'datetime',
        'quantite' => 'integer',
        'stock_precedent' => 'integer',
        'stock_nouveau' => 'integer',
        'pieces_jointes' => 'array',
        'est_ordonnancier' => 'boolean',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function produit(): BelongsTo
    {
        return $this->belongsTo(Produit::class);
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(StockLot::class, 'stock_lot_id');
    }

    public function operateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operateur_id');
    }

    public function pharmacienVisa(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pharmacien_visa_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaiementFeexPay extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'paiements_feexpay';

    protected $fillable = [
        'officine_id',
        'vente_id',
        'reference_feexpay',
        'operateur',
        'telephone_payeur',
        'montant',
        'statut',
        'transaction_id_operateur',
        'payload_reponse',
    ];

    protected $casts = [
        'montant' => 'decimal:2',
        'payload_reponse' => 'array',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function vente(): BelongsTo
    {
        return $this->belongsTo(VenteCaisse::class, 'vente_id');
    }
}

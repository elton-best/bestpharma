<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class VenteCaisse extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'ventes_caisse';

    protected $fillable = [
        'officine_id',
        'session_caisse_id',
        'caissier_id',
        'dispensation_id',
        'numero_ticket',
        'client_nom',
        'client_ifu',
        'montant_brut_ht',
        'montant_remise',
        'montant_tva',
        'montant_net_ttc',
        'montant_recu',
        'monnaie_rendue',
        'mode_reglement',
        'statut',
    ];

    protected $casts = [
        'montant_brut_ht' => 'decimal:2',
        'montant_remise' => 'decimal:2',
        'montant_tva' => 'decimal:2',
        'montant_net_ttc' => 'decimal:2',
        'montant_recu' => 'decimal:2',
        'monnaie_rendue' => 'decimal:2',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function sessionCaisse(): BelongsTo
    {
        return $this->belongsTo(SessionCaisse::class, 'session_caisse_id');
    }

    public function caissier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'caissier_id');
    }

    public function dispensation(): BelongsTo
    {
        return $this->belongsTo(Dispensation::class, 'dispensation_id');
    }

    public function lignes(): HasMany
    {
        return $this->hasMany(LigneVente::class, 'vente_id');
    }

    public function factureEmecef(): HasOne
    {
        return $this->hasOne(FactureEmecef::class, 'vente_id');
    }

    public function paiementFeexPay(): HasOne
    {
        return $this->hasOne(PaiementFeexPay::class, 'vente_id');
    }

    public function ecrituresSyscohada(): HasMany
    {
        return $this->hasMany(EcritureSyscohada::class, 'vente_id');
    }
}

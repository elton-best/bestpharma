<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FactureEmecef extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'factures_emecef';

    protected $fillable = [
        'officine_id',
        'vente_id',
        'numero_facture_dgi',
        'ifu_officine',
        'nim_machine',
        'type_facture',
        'compteur_type',
        'compteur_total',
        'code_mecef',
        'signature_dgi',
        'qr_code_data',
        'statut',
        'date_certification',
    ];

    protected $casts = [
        'compteur_type' => 'integer',
        'compteur_total' => 'integer',
        'date_certification' => 'datetime',
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

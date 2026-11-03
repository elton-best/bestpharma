<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EcritureSyscohada extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'ecritures_syscohada';

    protected $fillable = [
        'officine_id',
        'vente_id',
        'date_piece',
        'numero_piece',
        'numero_compte',
        'libelle_compte',
        'libelle_ecriture',
        'debit',
        'credit',
        'journal_code',
    ];

    protected $casts = [
        'date_piece' => 'date',
        'debit' => 'decimal:2',
        'credit' => 'decimal:2',
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

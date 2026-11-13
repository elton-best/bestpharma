<?php

declare(strict_types=1);

namespace App\Modules\Comptabilite\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComptaEcritureLigne extends Model
{
    protected $table = 'compta_ecriture_lignes';

    protected $fillable = [
        'officine_id',
        'ecriture_id',
        'compte_id',
        'line_order',
        'label',
        'debit',
        'credit',
        'third_party_ref',
    ];

    protected $casts = [
        'debit' => 'float',
        'credit' => 'float',
    ];

    public function ecriture(): BelongsTo
    {
        return $this->belongsTo(ComptaEcriture::class, 'ecriture_id');
    }

    public function compte(): BelongsTo
    {
        return $this->belongsTo(ComptaCompte::class, 'compte_id');
    }
}

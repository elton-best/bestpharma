<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RetourFournisseur extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'retours_fournisseur';

    protected $fillable = [
        'officine_id',
        'reference',
        'fournisseur_nom',
        'motif',
        'lots',
        'montant_attendu',
        'statut',
        'bon_retour_ref',
        'avoir_ref',
        'auteur_id',
    ];

    protected $casts = [
        'lots' => 'array',
        'montant_attendu' => 'decimal:2',
    ];

    public function officine(): BelongsTo { return $this->belongsTo(Officine::class); }
    public function auteur(): BelongsTo { return $this->belongsTo(User::class, 'auteur_id'); }
}

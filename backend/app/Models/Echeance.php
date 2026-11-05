<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Echeance extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'echeances';

    protected $fillable = [
        'officine_id',
        'titre',
        'responsable',
        'categorie',
        'priorite',
        'date_echeance',
        'periodicite',
        'reglementaire',
        'fait',
        'date_realisation',
        'preuve_titre',
        'justificatif_url',
        'notes',
        'archived',
        'created_by',
    ];

    protected $casts = [
        'date_echeance' => 'date',
        'date_realisation' => 'date',
        'fait' => 'boolean',
        'reglementaire' => 'boolean',
        'archived' => 'boolean',
    ];

    public function officine()
    {
        return $this->belongsTo(Officine::class);
    }
}

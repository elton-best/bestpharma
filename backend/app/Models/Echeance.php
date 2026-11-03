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
        'categorie',
        'date_echeance',
        'fait',
        'archived',
        'created_by',
    ];

    protected $casts = [
        'date_echeance' => 'date',
        'fait' => 'boolean',
        'archived' => 'boolean',
    ];

    public function officine()
    {
        return $this->belongsTo(Officine::class);
    }
}

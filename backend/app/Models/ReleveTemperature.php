<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReleveTemperature extends Model
{
    use HasUuids;

    protected $table = 'releves_temperature';

    protected $fillable = [
        'officine_id',
        'zone',
        'temperature',
        'temp_min',
        'temp_max',
        'humidite',
        'moment',
        'date_releve',
        'heure_releve',
        'statut_conformite',
        'agent_id',
        'non_conformite_id',
        'notes',
    ];

    protected $casts = [
        'temperature' => 'decimal:2',
        'temp_min' => 'decimal:2',
        'temp_max' => 'decimal:2',
        'humidite' => 'decimal:1',
        'date_releve' => 'date',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function nonConformite(): BelongsTo
    {
        return $this->belongsTo(NonConformite::class, 'non_conformite_id');
    }
}

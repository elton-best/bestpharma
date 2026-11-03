<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NettoyageRegistre extends Model
{
    use HasUuids;

    protected $table = 'nettoyage_registre';

    protected $fillable = [
        'officine_id',
        'zone',
        'frequence',
        'produit_utilise',
        'agent_id',
        'date_heure',
        'conforme',
        'visa_responsable',
        'notes',
    ];

    protected $casts = [
        'date_heure' => 'datetime',
        'conforme' => 'boolean',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function visa(): BelongsTo
    {
        return $this->belongsTo(User::class, 'visa_responsable');
    }
}

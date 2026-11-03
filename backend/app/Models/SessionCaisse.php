<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SessionCaisse extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'sessions_caisse';

    protected $fillable = [
        'officine_id',
        'caissier_id',
        'numero_session',
        'fond_caisse_ouverture',
        'total_encaisse_especes',
        'total_encaisse_mobile_money',
        'total_encaisse_carte',
        'fond_caisse_fermeture_theorique',
        'fond_caisse_fermeture_reel',
        'ecart_caisse',
        'statut',
        'opened_at',
        'closed_at',
        'notes_cloture',
    ];

    protected $casts = [
        'fond_caisse_ouverture' => 'decimal:2',
        'total_encaisse_especes' => 'decimal:2',
        'total_encaisse_mobile_money' => 'decimal:2',
        'total_encaisse_carte' => 'decimal:2',
        'fond_caisse_fermeture_theorique' => 'decimal:2',
        'fond_caisse_fermeture_reel' => 'decimal:2',
        'ecart_caisse' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function caissier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'caissier_id');
    }

    public function ventes(): HasMany
    {
        return $this->hasMany(VenteCaisse::class, 'session_caisse_id');
    }
}

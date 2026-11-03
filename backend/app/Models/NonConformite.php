<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NonConformite extends Model
{
    use HasUuids;

    protected $table = 'non_conformites';

    protected $fillable = [
        'id',
        'officine_id',
        'numero_nc',
        'titre',
        'description',
        'gravite',
        'processus',
        'source',
        'statut',
        'action_immediate',
        'action_preventive',
        'action_corrective',
        'analyse_causes_5m',
        'date_echeance_capa',
        'responsable_action',
        'efficacite_verifiee',
        'conclusion_efficacite',
        'cloturee_le',
        'cloturee_par',
        'created_by',
        'archived',
    ];

    protected $casts = [
        'efficacite_verifiee' => 'boolean',
        'date_echeance_capa' => 'date',
        'cloturee_le' => 'datetime',
        'archived' => 'boolean',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function createur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfficineParametre extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'officine_parametres';

    protected $fillable = [
        'officine_id',
        'cle',
        'valeur',
        'type_donnee',
        'description',
        'version',
        'archived',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'valeur' => 'array',
            'version' => 'integer',
            'archived' => 'boolean',
        ];
    }

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }
}

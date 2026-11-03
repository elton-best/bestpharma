<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UtilisateurOfficine extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'utilisateurs_officines';

    protected $fillable = [
        'officine_id',
        'user_id',
        'role_code',
        'actif',
        'archived',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'actif' => 'boolean',
            'archived' => 'boolean',
        ];
    }

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Officine extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'nom',
        'raison_sociale',
        'numero_licence',
        'date_licence',
        'adresse',
        'ville',
        'telephone',
        'email',
        'regime_fiscal',
        'fuseau',
        'devise',
        'actif',
        'archived',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date_licence' => 'date',
            'actif' => 'boolean',
            'archived' => 'boolean',
        ];
    }

    public function utilisateurs(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'utilisateurs_officines')
            ->withPivot('role_code', 'actif', 'archived')
            ->withTimestamps();
    }

    public function affectations(): HasMany
    {
        return $this->hasMany(UtilisateurOfficine::class);
    }

    public function parametres(): HasMany
    {
        return $this->hasMany(OfficineParametre::class);
    }

    public function appareils(): HasMany
    {
        return $this->hasMany(AppareilAutorise::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }
}

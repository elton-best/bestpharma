<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'telephone',
        'mfa_secret',
        'mfa_enabled',
        'mfa_enforced',
        'actif',
        'archived',
        'last_activity_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'mfa_secret',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_activity_at' => 'datetime',
            'password' => 'hashed',
            'mfa_enabled' => 'boolean',
            'mfa_enforced' => 'boolean',
            'actif' => 'boolean',
            'archived' => 'boolean',
        ];
    }

    public function officines(): BelongsToMany
    {
        return $this->belongsToMany(Officine::class, 'utilisateurs_officines')
            ->withPivot('role_code', 'actif', 'archived')
            ->withTimestamps();
    }

    public function affectations(): HasMany
    {
        return $this->hasMany(UtilisateurOfficine::class);
    }

    public function isMfaRequired(): bool
    {
        if ($this->mfa_enforced) {
            return true;
        }

        $rolesWithForcedMfa = [
            'promoteur',
            'pharmacien_titulaire',
            'pharmacien_adjoint',
            'pharmacien_remplacant',
            'rmq',
            'comptable',
        ];

        return $this->affectations()
            ->whereIn('role_code', $rolesWithForcedMfa)
            ->where('actif', true)
            ->where('archived', false)
            ->exists();
    }

    public function getOfficineIdAttribute(): ?string
    {
        $affectation = $this->affectations()->where('actif', true)->first();
        return $affectation ? $affectation->officine_id : null;
    }

    public function getRoleAttribute(): ?string
    {
        $affectation = $this->affectations()->where('actif', true)->first();
        return $affectation ? $affectation->role_code : null;
    }
}

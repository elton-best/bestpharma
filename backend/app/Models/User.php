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

    /**
     * Propriétés runtime de session / requête (non persistées dans la table users)
     */
    public ?string $officine_id = null;
    public ?string $role_code = null;

    protected static function booted(): void
    {
        static::saving(function (self $user) {
            unset($user->attributes['officine_id'], $user->attributes['role_code']);
        });
    }

    public function officines(): BelongsToMany
    {
        return $this->belongsToMany(Officine::class, 'utilisateurs_officines')
            ->withPivot('role_code', 'actif', 'archived')
            ->withTimestamps();
    }

    public function affectations(): HasMany
    {
        return $this->hasMany(UtilisateurOfficine::class, 'user_id');
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
        if (! empty($this->officine_id)) {
            return $this->officine_id;
        }

        $affectation = $this->affectations()->where('actif', true)->first();
        return $affectation ? $affectation->officine_id : null;
    }

    public function setOfficineIdAttribute($value): void
    {
        $this->officine_id = $value;
        unset($this->attributes['officine_id']);
    }

    public function getRoleAttribute(): ?string
    {
        return $this->getRoleCodeAttribute();
    }

    public function getRoleCodeAttribute(): ?string
    {
        if (! empty($this->role_code)) {
            return $this->role_code;
        }

        $affectation = $this->affectations()->where('actif', true)->first();
        return $affectation ? $affectation->role_code : null;
    }

    public function setRoleCodeAttribute($value): void
    {
        $this->role_code = $value;
        unset($this->attributes['role_code']);
    }
}

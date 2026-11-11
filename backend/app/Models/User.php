<?php
declare(strict_types=1);
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable;
    protected $attributes = ['is_active'=>true,'internal_active'=>true];
    protected $fillable = ['name','email','password','google_id','avatar_url','must_change_password'];
    protected $hidden = ['password','remember_token','mfa_secret','pending_email'];
    protected function casts(): array { return ['email_verified_at' => 'datetime','password' => 'hashed', 'is_platform_admin' => 'boolean', 'internal_active'=>'boolean','is_active'=>'boolean', 'mfa_confirmed_at'=>'datetime', 'is_support_staff' => 'boolean', 'is_support_coordinator' => 'boolean']; }
}

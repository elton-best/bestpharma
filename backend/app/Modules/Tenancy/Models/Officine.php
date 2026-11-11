<?php
declare(strict_types=1);
namespace App\Modules\Tenancy\Models;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
class Officine extends Model
{
    protected $table = 'officines';
    protected $fillable = ['organization_id','name','slug','email','phone','ifu','rccm','devise','status','onboarding_completed','onboarding_step'];
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'officine_user', 'officine_id', 'user_id')->withTimestamps();
    }
}

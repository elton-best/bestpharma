<?php
declare(strict_types=1);
namespace App\Modules\Tenancy\Models;
use Illuminate\Database\Eloquent\Model;
class Organization extends Model
{
    protected $table = 'organizations';
    protected $fillable = ['name','slug','owner_user_id'];
}

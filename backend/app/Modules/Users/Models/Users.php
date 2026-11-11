<?php
declare(strict_types=1);
namespace App\Modules\Users\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Users extends Model
{
    use BelongsToCompany;
    protected $table = 'users';
    protected $fillable = ['officine_id'];
}

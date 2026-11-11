<?php
declare(strict_types=1);
namespace App\Modules\ACL\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class ACL extends Model
{
    use BelongsToCompany;
    protected $table = 'acl';
    protected $fillable = ['officine_id'];
}

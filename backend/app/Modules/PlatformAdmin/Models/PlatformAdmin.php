<?php
declare(strict_types=1);
namespace App\Modules\PlatformAdmin\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class PlatformAdmin extends Model
{
    use BelongsToCompany;
    protected $table = 'platformadmin';
    protected $fillable = ['officine_id'];
}

<?php
declare(strict_types=1);
namespace App\Modules\Tenancy\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Tenancy extends Model
{
    use BelongsToCompany;
    protected $table = 'tenancy';
    protected $fillable = ['officine_id'];
}

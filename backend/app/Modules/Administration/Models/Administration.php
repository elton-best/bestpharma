<?php
declare(strict_types=1);
namespace App\Modules\Administration\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Administration extends Model
{
    use BelongsToCompany;
    protected $table = 'administration';
    protected $fillable = ['officine_id'];
}

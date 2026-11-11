<?php
declare(strict_types=1);
namespace App\Modules\Achats\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Achats extends Model
{
    use BelongsToCompany;
    protected $table = 'achats';
    protected $fillable = ['officine_id'];
}

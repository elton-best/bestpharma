<?php
declare(strict_types=1);
namespace App\Modules\Parametrage\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Parametrage extends Model
{
    use BelongsToCompany;
    protected $table = 'parametrage';
    protected $fillable = ['officine_id'];
}

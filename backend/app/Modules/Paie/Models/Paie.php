<?php
declare(strict_types=1);
namespace App\Modules\Paie\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Paie extends Model
{
    use BelongsToCompany;
    protected $table = 'paie';
    protected $fillable = ['officine_id'];
}

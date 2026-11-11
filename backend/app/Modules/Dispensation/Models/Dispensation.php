<?php
declare(strict_types=1);
namespace App\Modules\Dispensation\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Dispensation extends Model
{
    use BelongsToCompany;
    protected $table = 'dispensation';
    protected $fillable = ['officine_id'];
}

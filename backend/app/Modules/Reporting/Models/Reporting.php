<?php
declare(strict_types=1);
namespace App\Modules\Reporting\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Reporting extends Model
{
    use BelongsToCompany;
    protected $table = 'reporting';
    protected $fillable = ['officine_id'];
}

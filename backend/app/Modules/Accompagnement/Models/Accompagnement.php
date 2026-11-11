<?php
declare(strict_types=1);
namespace App\Modules\Accompagnement\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Accompagnement extends Model
{
    use BelongsToCompany;
    protected $table = 'accompagnement';
    protected $fillable = ['officine_id'];
}

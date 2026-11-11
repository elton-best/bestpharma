<?php
declare(strict_types=1);
namespace App\Modules\LocauxEquipements\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class LocauxEquipements extends Model
{
    use BelongsToCompany;
    protected $table = 'locauxequipements';
    protected $fillable = ['officine_id'];
}

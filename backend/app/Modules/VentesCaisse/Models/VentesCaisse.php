<?php
declare(strict_types=1);
namespace App\Modules\VentesCaisse\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class VentesCaisse extends Model
{
    use BelongsToCompany;
    protected $table = 'ventescaisse';
    protected $fillable = ['officine_id'];
}

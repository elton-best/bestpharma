<?php
declare(strict_types=1);
namespace App\Modules\Dashboard\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Dashboard extends Model
{
    use BelongsToCompany;
    protected $table = 'dashboard';
    protected $fillable = ['officine_id'];
}

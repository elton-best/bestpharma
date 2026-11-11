<?php
declare(strict_types=1);
namespace App\Modules\Personnel\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Personnel extends Model
{
    use BelongsToCompany;
    protected $table = 'personnel';
    protected $fillable = ['officine_id'];
}

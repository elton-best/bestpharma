<?php
declare(strict_types=1);
namespace App\Modules\Stock\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Stock extends Model
{
    use BelongsToCompany;
    protected $table = 'stock';
    protected $fillable = ['officine_id'];
}

<?php
declare(strict_types=1);
namespace App\Modules\Tresorerie\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Tresorerie extends Model
{
    use BelongsToCompany;
    protected $table = 'tresorerie';
    protected $fillable = ['officine_id'];
}

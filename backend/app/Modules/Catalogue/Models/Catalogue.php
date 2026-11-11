<?php
declare(strict_types=1);
namespace App\Modules\Catalogue\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Catalogue extends Model
{
    use BelongsToCompany;
    protected $table = 'catalogue';
    protected $fillable = ['officine_id'];
}

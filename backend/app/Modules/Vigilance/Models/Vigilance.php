<?php
declare(strict_types=1);
namespace App\Modules\Vigilance\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Vigilance extends Model
{
    use BelongsToCompany;
    protected $table = 'vigilance';
    protected $fillable = ['officine_id'];
}

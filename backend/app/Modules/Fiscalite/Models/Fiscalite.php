<?php
declare(strict_types=1);
namespace App\Modules\Fiscalite\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Fiscalite extends Model
{
    use BelongsToCompany;
    protected $table = 'fiscalite';
    protected $fillable = ['officine_id'];
}

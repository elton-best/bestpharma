<?php
declare(strict_types=1);
namespace App\Modules\Qualite\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Qualite extends Model
{
    use BelongsToCompany;
    protected $table = 'qualite';
    protected $fillable = ['officine_id'];
}

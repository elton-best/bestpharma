<?php
declare(strict_types=1);
namespace App\Modules\Comptabilite\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Comptabilite extends Model
{
    use BelongsToCompany;
    protected $table = 'comptabilite';
    protected $fillable = ['officine_id'];
}

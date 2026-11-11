<?php
declare(strict_types=1);
namespace App\Modules\Notifications\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Notifications extends Model
{
    use BelongsToCompany;
    protected $table = 'notifications';
    protected $fillable = ['officine_id'];
}

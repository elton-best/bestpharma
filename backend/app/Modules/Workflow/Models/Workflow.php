<?php
declare(strict_types=1);
namespace App\Modules\Workflow\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Workflow extends Model
{
    use BelongsToCompany;
    protected $table = 'workflow';
    protected $fillable = ['officine_id'];
}

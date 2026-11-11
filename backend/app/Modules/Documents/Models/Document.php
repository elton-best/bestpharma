<?php
declare(strict_types=1);
namespace App\Modules\Documents\Models;
use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
final class Document extends Model
{
    use BelongsToCompany;
    protected $table = 'documents';
    protected $guarded = ['id', 'officine_id'];
}

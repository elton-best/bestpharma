<?php

declare(strict_types=1);
namespace App\Modules\Qualite\Models;

use App\Modules\Tenancy\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class QualityAction extends Model
{
    use BelongsToCompany;

    protected $fillable = ['title', 'chapter', 'severity', 'owner', 'due_date', 'status', 'description', 'resolution'];
    protected $hidden = ['officine_id', 'created_by'];
}

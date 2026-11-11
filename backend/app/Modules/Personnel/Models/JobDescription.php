<?php

declare(strict_types=1);

namespace App\Modules\Personnel\Models;

use Illuminate\Database\Eloquent\Model;

class JobDescription extends Model
{
    protected $table = 'job_descriptions';

    protected $fillable = [
        'officine_id',
        'code',
        'title',
        'department',
        'main_missions',
        'required_skills',
        'required_profile',
        'is_active',
        'version',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'version' => 'integer',
    ];
}

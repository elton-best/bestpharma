<?php

declare(strict_types=1);

namespace App\Modules\PlatformAdmin\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $table = 'platform_settings';

    protected $fillable = [
        'officine_id',
        'setting_key',
        'setting_value',
        'updated_by_user_id',
        'version',
    ];

    protected $casts = [
        'setting_value' => 'array',
        'version' => 'integer',
    ];
}

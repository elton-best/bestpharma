<?php

declare(strict_types=1);

namespace App\Modules\PlatformAdmin\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $table = 'plans';

    protected $fillable = [
        'code',
        'name',
        'description',
        'price_label',
        'max_users',
        'is_active',
        'version',
    ];

    protected $casts = [
        'max_users' => 'integer',
        'is_active' => 'boolean',
        'version' => 'integer',
    ];

    public function features(): HasMany
    {
        return $this->hasMany(PlanFeature::class, 'plan_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class, 'plan_id');
    }
}

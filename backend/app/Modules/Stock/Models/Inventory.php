<?php

declare(strict_types=1);

namespace App\Modules\Stock\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Inventory extends Model
{
    protected $table = 'inventories';

    protected $fillable = [
        'officine_id',
        'reference',
        'inventory_date',
        'scope_description',
        'status',
        'created_by_user_id',
        'approved_by_user_id',
        'approved_at',
        'total_variance_qty',
        'version',
    ];

    protected $casts = [
        'total_variance_qty' => 'integer',
        'approved_at' => 'datetime',
        'version' => 'integer',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(InventoryLine::class, 'inventory_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Achats\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierContact extends Model
{
    protected $table = 'supplier_contacts';

    protected $fillable = [
        'officine_id',
        'supplier_id',
        'name',
        'role_title',
        'email',
        'phone',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Achats\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierSelection extends Model
{
    protected $table = 'supplier_selections';

    protected $fillable = [
        'officine_id',
        'reference',
        'title',
        'need_description',
        'selection_criteria',
        'status',
        'selected_supplier_id',
        'selection_justification',
        'created_by_user_id',
        'validated_by_user_id',
        'validated_at',
        'version',
    ];

    protected $casts = [
        'selection_criteria' => 'array',
        'validated_at' => 'datetime',
        'version' => 'integer',
    ];

    public function quotes(): HasMany
    {
        return $this->hasMany(SupplierQuote::class, 'selection_id');
    }

    public function selectedSupplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'selected_supplier_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function validatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by_user_id');
    }
}

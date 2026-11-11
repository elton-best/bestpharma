<?php

declare(strict_types=1);

namespace App\Modules\Achats\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $table = 'suppliers';

    protected $fillable = [
        'officine_id',
        'code',
        'name',
        'type',
        'category',
        'ifu',
        'rccm',
        'email',
        'phone',
        'address',
        'city',
        'country',
        'status',
        'average_rating',
        'notes',
        'version',
    ];

    protected $casts = [
        'average_rating' => 'float',
        'version' => 'integer',
    ];

    public function contacts(): HasMany
    {
        return $this->hasMany(SupplierContact::class, 'supplier_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(SupplierDocument::class, 'supplier_id');
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(SupplierEvaluation::class, 'supplier_id');
    }

    public function complaints(): HasMany
    {
        return $this->hasMany(SupplierComplaint::class, 'supplier_id');
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(SupplierContract::class, 'supplier_id');
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(SupplierQuote::class, 'supplier_id');
    }
}

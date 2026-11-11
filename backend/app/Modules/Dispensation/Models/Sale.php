<?php

declare(strict_types=1);

namespace App\Modules\Dispensation\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Sale extends Model
{
    protected $table = 'sales';

    protected $fillable = [
        'officine_id',
        'reference',
        'idempotency_key',
        'sale_type',
        'status',
        'patient_minimized_ref',
        'total_amount',
        'payment_status',
        'payment_method',
        'cashier_user_id',
        'validated_by_user_id',
        'validated_at',
        'paid_at',
        'notes',
        'version',
    ];

    protected $casts = [
        'total_amount' => 'float',
        'validated_at' => 'datetime',
        'paid_at' => 'datetime',
        'version' => 'integer',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(SaleLine::class, 'sale_id');
    }

    public function prescription(): HasOne
    {
        return $this->hasOne(PrescriptionReference::class, 'sale_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(PharmaceuticalReview::class, 'sale_id');
    }

    public function dispensingEvents(): HasMany
    {
        return $this->hasMany(DispensingEvent::class, 'sale_id');
    }

    public function returns(): HasMany
    {
        return $this->hasMany(SaleReturn::class, 'sale_id');
    }

    public function credits(): HasMany
    {
        return $this->hasMany(Credit::class, 'sale_id');
    }

    public function validatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by_user_id');
    }
}

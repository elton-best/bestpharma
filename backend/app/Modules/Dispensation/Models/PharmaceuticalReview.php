<?php

declare(strict_types=1);

namespace App\Modules\Dispensation\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PharmaceuticalReview extends Model
{
    protected $table = 'pharmaceutical_reviews';

    protected $fillable = [
        'officine_id',
        'sale_id',
        'pharmacist_user_id',
        'decision',
        'posology_checked',
        'interactions_checked',
        'contraindications_checked',
        'clinical_notes',
        'reviewed_at',
        'version',
    ];

    protected $casts = [
        'posology_checked' => 'boolean',
        'interactions_checked' => 'boolean',
        'contraindications_checked' => 'boolean',
        'reviewed_at' => 'datetime',
        'version' => 'integer',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'sale_id');
    }

    public function pharmacist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pharmacist_user_id');
    }
}

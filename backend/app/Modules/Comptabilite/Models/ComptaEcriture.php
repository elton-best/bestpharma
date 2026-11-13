<?php

declare(strict_types=1);

namespace App\Modules\Comptabilite\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ComptaEcriture extends Model
{
    protected $table = 'compta_ecritures';

    protected $fillable = [
        'officine_id',
        'exercice_id',
        'journal_id',
        'reference',
        'entry_date',
        'label',
        'source_type',
        'source_id',
        'idempotency_key',
        'status',
        'total_debit',
        'total_credit',
        'created_by_user_id',
        'validated_by_user_id',
        'validated_at',
        'entry_hash',
        'version',
    ];

    protected $casts = [
        'entry_date' => 'date',
        'validated_at' => 'datetime',
        'total_debit' => 'float',
        'total_credit' => 'float',
    ];

    protected static function booted(): void
    {
        static::updating(function (ComptaEcriture $ecriture) {
            if ($ecriture->getOriginal('status') === 'validee') {
                throw new \DomainException("RG-31 / RG-38: Une écriture comptable validée est scellée et inaltérable. Passer une écriture de contre-passation (extourne).");
            }
        });

        static::deleting(function (ComptaEcriture $ecriture) {
            if ($ecriture->status === 'validee') {
                throw new \DomainException("RG-31 / RG-38: Une écriture comptable validée ne peut pas être supprimée.");
            }
        });
    }

    public function exercice(): BelongsTo
    {
        return $this->belongsTo(ComptaExercice::class, 'exercice_id');
    }

    public function journal(): BelongsTo
    {
        return $this->belongsTo(ComptaJournal::class, 'journal_id');
    }

    public function lignes(): HasMany
    {
        return $this->hasMany(ComptaEcritureLigne::class, 'ecriture_id')->orderBy('line_order');
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

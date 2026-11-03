<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvaluationArticle extends Model
{
    use HasUuids;

    protected $table = 'evaluations_articles';

    protected $fillable = [
        'campagne_id',
        'officine_id',
        'chapitre_numero',
        'chapitre_titre',
        'article_numero',
        'article_libelle',
        'processus',
        'cotation',
        'preuve',
        'commentaire',
        'non_conformite_id',
        'responsable_id',
        'date_evaluation',
    ];

    protected $casts = [
        'chapitre_numero' => 'integer',
        'date_evaluation' => 'datetime',
    ];

    public function campagne(): BelongsTo
    {
        return $this->belongsTo(CampagneAutoEvaluation::class, 'campagne_id');
    }

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function nonConformite(): BelongsTo
    {
        return $this->belongsTo(NonConformite::class, 'non_conformite_id');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsable_id');
    }
}

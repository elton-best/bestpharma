<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CampagneAutoEvaluation extends Model
{
    use HasUuids;

    protected $table = 'campagnes_auto_evaluation';

    protected $fillable = [
        'officine_id',
        'titre',
        'annee',
        'date_debut',
        'date_cloture',
        'auditeur_id',
        'statut',
        'score_global',
        'synthese',
    ];

    protected $casts = [
        'annee' => 'integer',
        'date_debut' => 'date',
        'date_cloture' => 'date',
        'score_global' => 'decimal:2',
    ];

    public function officine(): BelongsTo
    {
        return $this->belongsTo(Officine::class);
    }

    public function auditeur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auditeur_id');
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(EvaluationArticle::class, 'campagne_id');
    }

    /**
     * Calcule le score global selon la formule officielle du Guide BPD :
     * Conforme = 1 pt
     * Ecart mineur = 0.5 pt
     * Ecart majeur = 0 pt
     * Non applicable = exclus du dénominateur
     */
    public function recalculerScore(): float
    {
        $articles = $this->evaluations()
            ->where('cotation', '!=', 'non_evalue')
            ->get();

        $applicables = $articles->where('cotation', '!=', 'non_applicable');
        $totalApplicables = $applicables->count();

        if ($totalApplicables === 0) {
            $this->update(['score_global' => 0]);
            return 0.0;
        }

        $points = 0.0;
        foreach ($applicables as $art) {
            if ($art->cotation === 'conforme') {
                $points += 1.0;
            } elseif ($art->cotation === 'ecart_mineur') {
                $points += 0.5;
            }
        }

        $score = round(($points / $totalApplicables) * 100, 2);
        $this->update(['score_global' => $score]);
        return $score;
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CampagneAutoEvaluation;
use App\Models\EvaluationArticle;
use App\Models\NonConformite;
use App\Services\ReferentielBpdService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AutoEvaluationController extends Controller
{
    /**
     * Récupère ou initialise la campagne active d'auto-évaluation de l'officine.
     */
    public function campagneCourante(Request $request, string $officineId): JsonResponse
    {
        $campagne = CampagneAutoEvaluation::where('officine_id', $officineId)
            ->where('statut', 'en_cours')
            ->orderByDesc('created_at')
            ->first();

        // Initialisation automatique de la campagne annuelle si aucune n'est en cours
        if (!$campagne) {
            $annee = Carbon::now()->year;
            $campagne = CampagneAutoEvaluation::create([
                'id' => (string) Str::uuid(),
                'officine_id' => $officineId,
                'titre' => "Auto-évaluation annuelle de conformité BPD {$annee}",
                'annee' => $annee,
                'date_debut' => Carbon::now()->toDateString(),
                'statut' => 'en_cours',
                'auditeur_id' => $request->user()?->id,
                'score_global' => 0.0,
            ]);

            // Peuplement avec les articles du Guide BPD ABMed
            $articlesRef = ReferentielBpdService::genererArticlesPourCampagne();
            foreach ($articlesRef as $art) {
                EvaluationArticle::create([
                    'id' => (string) Str::uuid(),
                    'campagne_id' => $campagne->id,
                    'officine_id' => $officineId,
                    'chapitre_numero' => $art['chapitre_numero'],
                    'chapitre_titre' => $art['chapitre_titre'],
                    'article_numero' => $art['article_numero'],
                    'article_libelle' => $art['article_libelle'],
                    'processus' => $art['processus'],
                    'cotation' => 'non_evalue',
                ]);
            }
        }

        $evaluations = $campagne->evaluations()
            ->with(['nonConformite:id,numero_nc,titre,gravite,statut', 'responsable:id,name,email'])
            ->orderBy('chapitre_numero')
            ->orderBy('article_numero')
            ->get();

        // Synthèse par chapitre
        $chapitresRef = ReferentielBpdService::getChapitres();
        $syntheseChapitres = [];

        foreach ($chapitresRef as $ch) {
            $num = $ch['numero'];
            $articlesCh = $evaluations->where('chapitre_numero', $num);
            $applicables = $articlesCh->where('cotation', '!=', 'non_applicable')->where('cotation', '!=', 'non_evalue');
            $countApp = $applicables->count();

            $scoreCh = 0.0;
            if ($countApp > 0) {
                $pts = 0.0;
                foreach ($applicables as $a) {
                    if ($a->cotation === 'conforme') $pts += 1.0;
                    elseif ($a->cotation === 'ecart_mineur') $pts += 0.5;
                }
                $scoreCh = round(($pts / $countApp) * 100, 1);
            }

            $syntheseChapitres[] = [
                'numero' => $num,
                'titre' => $ch['titre'],
                'processus' => $ch['processus'],
                'total_articles' => $articlesCh->count(),
                'evalues' => $applicables->count(),
                'conformes' => $articlesCh->where('cotation', 'conforme')->count(),
                'ecarts_mineurs' => $articlesCh->where('cotation', 'ecart_mineur')->count(),
                'ecarts_majeurs' => $articlesCh->where('cotation', 'ecart_majeur')->count(),
                'score_chapitre' => $scoreCh,
            ];
        }

        return response()->json([
            'campagne' => $campagne,
            'evaluations' => $evaluations,
            'synthese_chapitres' => $syntheseChapitres,
            'statistiques' => [
                'score_global' => $campagne->score_global,
                'total_articles' => $evaluations->count(),
                'total_conformes' => $evaluations->where('cotation', 'conforme')->count(),
                'total_ecarts_mineurs' => $evaluations->where('cotation', 'ecart_mineur')->count(),
                'total_ecarts_majeurs' => $evaluations->where('cotation', 'ecart_majeur')->count(),
                'total_non_applicables' => $evaluations->where('cotation', 'non_applicable')->count(),
                'total_non_evalues' => $evaluations->where('cotation', 'non_evalue')->count(),
            ],
        ]);
    }

    /**
     * Cote un article (Conforme, Écart mineur, Écart majeur, Non applicable) et recalcule le score.
     */
    public function evaluerArticle(Request $request, string $officineId, string $evaluationId): JsonResponse
    {
        $evaluation = EvaluationArticle::where('officine_id', $officineId)->findOrFail($evaluationId);

        $validated = $request->validate([
            'cotation' => 'required|string|in:conforme,ecart_mineur,ecart_majeur,non_applicable,non_evalue',
            'preuve' => 'nullable|string',
            'commentaire' => 'nullable|string',
        ]);

        $evaluation->update([
            'cotation' => $validated['cotation'],
            'preuve' => $validated['preuve'] ?? $evaluation->preuve,
            'commentaire' => $validated['commentaire'] ?? $evaluation->commentaire,
            'responsable_id' => $request->user()?->id,
            'date_evaluation' => Carbon::now('Africa/Porto-Novo'),
        ]);

        // Recalcul du score de la campagne
        $nouveauScore = $evaluation->campagne->recalculerScore();

        return response()->json([
            'evaluation' => $evaluation->fresh(['nonConformite', 'responsable']),
            'nouveau_score_global' => $nouveauScore,
        ]);
    }

    /**
     * Déclenche une action corrective / non-conformité pour un article en écart (BPD10-F07).
     */
    public function genererCapa(Request $request, string $officineId, string $evaluationId): JsonResponse
    {
        $evaluation = EvaluationArticle::where('officine_id', $officineId)->findOrFail($evaluationId);

        $validated = $request->validate([
            'action_corrective' => 'required|string',
            'cause_principale' => 'nullable|string',
        ]);

        $now = Carbon::now('Africa/Porto-Novo');
        $annee = $now->year;
        $count = NonConformite::where('officine_id', $officineId)->whereYear('created_at', $annee)->count() + 1;
        $numero = sprintf('NC-%d-%03d', $annee, $count);
        $gravite = ($evaluation->cotation === 'ecart_majeur') ? 'critique' : 'majeure';

        $nc = NonConformite::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $officineId,
            'numero_nc' => $numero,
            'titre' => "Écart Art. {$evaluation->article_numero} : " . Str::limit($evaluation->article_libelle, 60),
            'description' => "Écart constaté lors de l'auto-évaluation BPD pour l'article {$evaluation->article_numero} ({$evaluation->chapitre_titre}) : {$evaluation->article_libelle}",
            'source' => 'auto_inspection',
            'gravite' => $gravite,
            'statut' => 'ouverte',
            'analyse_causes_5m' => $validated['cause_principale'] ?? 'Procédure ou enregistrement manquant ou non appliqué.',
            'action_corrective' => $validated['action_corrective'],
            'responsable_action' => 'Pharmacien Titulaire / RMQ',
            'created_by' => $request->user()?->id,
        ]);

        $evaluation->update([
            'non_conformite_id' => $nc->id,
        ]);

        return response()->json([
            'evaluation' => $evaluation->fresh('nonConformite'),
            'non_conformite' => $nc,
            'message' => "Fiche Non-Conformité & Plan CAPA créés avec succès pour l'article {$evaluation->article_numero}.",
        ], 201);
    }

    /**
     * Rapport officiel d'auto-inspection prêt à présenter à l'ABMed (AE-06).
     */
    public function rapport(Request $request, string $officineId): JsonResponse
    {
        $campagne = CampagneAutoEvaluation::where('officine_id', $officineId)
            ->with(['officine', 'auditeur'])
            ->orderByDesc('created_at')
            ->firstOrFail();

        $evaluations = $campagne->evaluations()->with('nonConformite')->get();

        return response()->json([
            'campagne' => $campagne,
            'officine' => $campagne->officine,
            'date_generation' => Carbon::now('Africa/Porto-Novo')->toDateTimeString(),
            'score_global' => $campagne->score_global,
            'synthese_statuts' => [
                'total' => $evaluations->count(),
                'conformes' => $evaluations->where('cotation', 'conforme')->count(),
                'ecarts_mineurs' => $evaluations->where('cotation', 'ecart_mineur')->count(),
                'ecarts_majeurs' => $evaluations->where('cotation', 'ecart_majeur')->count(),
                'non_applicables' => $evaluations->where('cotation', 'non_applicable')->count(),
            ],
            'actions_correctives_requises' => $evaluations->whereNotNull('non_conformite_id')->map(function ($ev) {
                return [
                    'article' => $ev->article_numero,
                    'libelle' => $ev->article_libelle,
                    'gravite' => $ev->cotation,
                    'nc_numero' => $ev->nonConformite?->numero_nc,
                    'nc_titre' => $ev->nonConformite?->titre,
                ];
            }),
        ]);
    }
}

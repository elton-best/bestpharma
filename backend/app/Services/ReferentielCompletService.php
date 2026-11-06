<?php
namespace App\Services;

class ReferentielCompletService
{
    public function source(): array
    {
        $racine = dirname(__DIR__, 3);
        return (new ImportReferentielBpdService)->verifier(
            file_get_contents($racine.'/references/abmed/extraction/articles-a-relire.json'),
            file_get_contents($racine.'/references/abmed/guide-bpdisp.pdf')
        );
    }

    public function chapitres(): array
    {
        $titres = ['Système de management de la qualité', 'Personnel', 'Documentation', 'Locaux et équipements',
            'Approvisionnement', 'Sous-traitance', 'Dispensation', 'Gestion des retours, réclamations, retraits et rappels de lots',
            'Destruction des déchets pharmaceutiques', 'Auto-inspection et audit interne'];
        $processus = ['TAM', 'GAR', 'QAM', 'GAR', 'GAC', 'TAM', 'GAD', 'GAD', 'GAC', 'QAM'];
        $source = $this->source();
        return array_map(fn ($i) => ['numero' => $i + 1, 'titre' => $titres[$i], 'processus' => $processus[$i],
            'articles_count' => $source['repartition'][$i + 1]], range(0, 9));
    }

    public function articles(): array
    {
        $chapitres = $this->chapitres();
        return array_map(fn ($a) => [
            'chapitre_numero' => $a['chapitre'], 'chapitre_titre' => $chapitres[$a['chapitre'] - 1]['titre'],
            'article_numero' => $a['numero'], 'article_libelle' => $a['texte_extrait'],
            'processus' => $chapitres[$a['chapitre'] - 1]['processus'],
        ], $this->source()['articles']);
    }
}

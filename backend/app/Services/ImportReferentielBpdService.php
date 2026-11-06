<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/** Préparation uniquement : ne valide ni n'active un référentiel réglementaire. */
class ImportReferentielBpdService
{
    public function verifier(string $json, string $pdf): array
    {
        $donnees = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($donnees)
            || ($donnees['statut'] ?? null) !== 'extraction_a_relire_non_importee'
            || ($donnees['source_sha256'] ?? null) !== hash('sha256', $pdf)
            || ($donnees['total_articles'] ?? null) !== 267
            || ($donnees['pages_pdf'] ?? null) !== 28
            || !is_string($donnees['decision'] ?? null)
            || trim($donnees['decision']) === '') {
            throw new InvalidArgumentException('Source, statut ou métadonnées du référentiel invalides.');
        }
        $attendus = [];
        foreach ([31, 21, 31, 38, 27, 17, 75, 13, 5, 9] as $i => $total) {
            for ($n = 1; $n <= $total; $n++) {
                $attendus[] = ($i + 1).'.'.$n;
            }
        }
        $articles = $donnees['articles'] ?? null;
        if (!is_array($articles) || array_column($articles, 'numero') !== $attendus) {
            throw new InvalidArgumentException('Numérotation absente, répétée ou hors séquence.');
        }
        foreach ($articles as $article) {
            if (($article['statut'] ?? null) !== 'a_relire'
                || ($article['chapitre'] ?? null) !== (int) explode('.', $article['numero'])[0]
                || !is_string($article['texte_extrait'] ?? null)
                || trim($article['texte_extrait']) === ''
                || !is_array($article['pages_pdf'] ?? null) || $article['pages_pdf'] === []) {
                throw new InvalidArgumentException('Un article est vide ou ses métadonnées sont invalides.');
            }
            foreach ($article['pages_pdf'] as $page) {
                if (!is_int($page) || $page < 1 || $page > 28) {
                    throw new InvalidArgumentException('Page source invalide.');
                }
            }
        }
        return $donnees;
    }

    public function importer(string $json, string $pdf): array
    {
        $donnees = $this->verifier($json, $pdf);
        // L'identité inclut les textes et la provenance. Un changement crée une autre version.
        $id = hash('sha256', $json);
        return DB::transaction(function () use ($id, $donnees) {
            // ON CONFLICT DO NOTHING protège aussi deux imports simultanés.
            $cree = DB::table('versions_referentiel_bpd')->insertOrIgnore([
                'id' => $id,
                'source_sha256' => $donnees['source_sha256'],
                'decision' => $donnees['decision'],
                'total_articles' => count($donnees['articles']),
                'statut' => 'a_relire',
                'contenu' => json_encode($donnees, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                'created_at' => now(),
            ]);
            if (!$cree && !DB::table('versions_referentiel_bpd')->where('id', $id)->exists()) {
                throw new \RuntimeException('Import non enregistré.');
            }
            return ['id' => $id, 'cree' => (bool) $cree, 'statut' => 'a_relire'];
        });
    }
}

<?php

namespace Tests\Unit;

use App\Services\ImportReferentielBpdService;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class ImportReferentielBpdTest extends TestCase
{
    private function source(): array
    {
        $racine = dirname(__DIR__, 3);
        return [
            file_get_contents($racine.'/references/abmed/extraction/articles-a-relire.json'),
            file_get_contents($racine.'/references/abmed/guide-bpdisp.pdf'),
        ];
    }

    public function test_source_fournie_complete_et_encore_a_relire(): void
    {
        [$json, $pdf] = $this->source();
        $resultat = (new ImportReferentielBpdService)->verifier($json, $pdf);
        $this->assertCount(267, $resultat['articles']);
        $this->assertSame('1.1', $resultat['articles'][0]['numero']);
        $this->assertSame('10.9', $resultat['articles'][266]['numero']);
    }

    public function test_un_pdf_different_est_refuse(): void
    {
        [$json, $pdf] = $this->source();
        $this->expectException(InvalidArgumentException::class);
        (new ImportReferentielBpdService)->verifier($json, $pdf.'alteration');
    }

    public function test_un_doublon_est_refuse(): void
    {
        [$json, $pdf] = $this->source();
        $donnees = json_decode($json, true);
        $donnees['articles'][1]['numero'] = '1.1';
        $this->expectException(InvalidArgumentException::class);
        (new ImportReferentielBpdService)->verifier(json_encode($donnees), $pdf);
    }

    public function test_un_article_vide_est_refuse(): void
    {
        [$json, $pdf] = $this->source();
        $donnees = json_decode($json, true);
        $donnees['articles'][1]['texte_extrait'] = ' ';
        $this->expectException(InvalidArgumentException::class);
        (new ImportReferentielBpdService)->verifier(json_encode($donnees), $pdf);
    }

    public function test_une_pretendue_validation_est_refusee(): void
    {
        [$json, $pdf] = $this->source();
        $donnees = json_decode($json, true);
        $donnees['articles'][1]['statut'] = 'valide';
        $this->expectException(InvalidArgumentException::class);
        (new ImportReferentielBpdService)->verifier(json_encode($donnees), $pdf);
    }
}

<?php
namespace Tests\Unit;
use App\Services\CatalogueCanevasService;
use App\Services\ReferentielCompletService;
use PHPUnit\Framework\TestCase;
class CanevasEtGuideCompletTest extends TestCase
{
    public function test_canevas_uniques_et_sources_integrales(): void
    {
        $service = new CatalogueCanevasService;
        $canevas = $service->tous();
        $this->assertCount(39, $canevas);
        $this->assertCount(39, array_unique(array_column($canevas, 'id')));
        foreach ($canevas as $c) {
            $this->assertSame($c['sha256'], hash_file('sha256', dirname(__DIR__, 3).'/0000. DIGIT ABMEB/'.$c['fichier']));
            $champs = $service->champs($c);
            $this->assertNotEmpty($champs);
            $this->assertSame($champs, array_values(array_unique($champs)));
        }
    }
    public function test_grille_complete_avec_texte_source_et_ordre_numerique(): void
    {
        $service = new ReferentielCompletService;
        $articles = $service->articles();
        $this->assertCount(267, $articles);
        $this->assertSame(array_column($service->source()['articles'], 'texte_extrait'), array_column($articles, 'article_libelle'));
        $this->assertSame([31,21,31,38,27,17,75,13,5,9], array_column($service->chapitres(), 'articles_count'));
        $this->assertSame('1.10', $articles[9]['article_numero']);
        $this->assertSame('10.9', $articles[266]['article_numero']);
    }
}

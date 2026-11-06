<?php

namespace Tests\Unit;

use App\Services\ImportCorpusService;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class ImportCorpusTest extends TestCase
{
    private function sources(): array
    {
        $racine = dirname(__DIR__, 3);
        return [file_get_contents($racine.'/docs/manifeste-import-corpus.json'), $racine.'/0000. DIGIT ABMEB'];
    }

    public function test_toutes_les_sources_sont_verifiees_sans_attribution_ni_approbation(): void
    {
        [$json, $racine] = $this->sources();
        $m = (new ImportCorpusService)->verifier($json, $racine);
        $this->assertCount(62, $m['fichiers']);
        $this->assertCount(91, $m['documents_inventories']);
        foreach ($m['fichiers'] as $f) $this->assertNull($f['code_documentaire_confirme']);
    }

    public function test_une_source_modifiee_est_refusee(): void
    {
        [$json, $racine] = $this->sources();
        $m = json_decode($json, true);
        $m['fichiers'][0]['sha256'] = str_repeat('0', 64);
        $this->expectException(InvalidArgumentException::class);
        (new ImportCorpusService)->verifier(json_encode($m), $racine);
    }

    public function test_sortie_du_repertoire_refusee(): void
    {
        [$json, $racine] = $this->sources();
        $m = json_decode($json, true);
        $m['fichiers'][0]['chemin'] = '../README.md';
        $this->expectException(InvalidArgumentException::class);
        (new ImportCorpusService)->verifier(json_encode($m), $racine);
    }

    public function test_fichier_repete_refuse(): void
    {
        [$json, $racine] = $this->sources();
        $m = json_decode($json, true);
        $m['fichiers'][1] = $m['fichiers'][0];
        $this->expectException(InvalidArgumentException::class);
        (new ImportCorpusService)->verifier(json_encode($m), $racine);
    }
}

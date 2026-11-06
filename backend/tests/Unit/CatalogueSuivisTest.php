<?php

namespace Tests\Unit;

use App\Services\CatalogueSuivisService;
use PHPUnit\Framework\TestCase;

class CatalogueSuivisTest extends TestCase
{
    public function test_catalogue_demo_aligne_et_sources_identifiees(): void
    {
        $service = new CatalogueSuivisService;
        $demo = json_decode(file_get_contents(dirname(__DIR__, 3).'/mock-data/catalogue-suivis.json'), true);
        foreach (['formations', 'maintenance'] as $type) {
            $d = $service->definition($type);
            $this->assertSame($d, $demo[$type]);
            $this->assertCount(count($d['champs']), array_unique(array_column($d['champs'], 'cle')));
            $this->assertSame(64, strlen($d['source']['sha256']));
            $source = dirname(__DIR__, 3).'/0000. DIGIT ABMEB/2.RESSOURCES ET COLLABORATION/'.$d['source']['fichier'];
            $this->assertSame($d['source']['sha256'], hash_file('sha256', $source));
        }
    }
}

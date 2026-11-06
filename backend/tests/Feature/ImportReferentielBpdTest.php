<?php

namespace Tests\Feature;

use App\Services\ImportReferentielBpdService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ImportReferentielBpdTest extends TestCase
{
    use DatabaseTransactions;

    public function test_import_repete_sans_doublon_et_sans_modifier_les_campagnes(): void
    {
        $racine = dirname(__DIR__, 3);
        $json = file_get_contents($racine.'/references/abmed/extraction/articles-a-relire.json');
        $pdf = file_get_contents($racine.'/references/abmed/guide-bpdisp.pdf');
        $avant = DB::table('campagnes_auto_evaluation')->orderBy('id')->get()->toJson();
        $evaluations = DB::table('evaluations_articles')->orderBy('id')->get()->toJson();
        $service = new ImportReferentielBpdService;
        $premier = $service->importer($json, $pdf);
        $second = $service->importer($json, $pdf);
        $this->assertSame($premier['id'], $second['id']);
        $this->assertFalse($second['cree']);
        $this->assertSame(1, DB::table('versions_referentiel_bpd')->where('id', $premier['id'])->count());
        $this->assertDatabaseHas('versions_referentiel_bpd', ['id' => $premier['id'], 'statut' => 'a_relire', 'total_articles' => 267]);
        $this->assertSame($avant, DB::table('campagnes_auto_evaluation')->orderBy('id')->get()->toJson());
        $this->assertSame($evaluations, DB::table('evaluations_articles')->orderBy('id')->get()->toJson());
    }
}

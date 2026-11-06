<?php
namespace Tests\Unit;
use App\Services\CalculsCanevasService;
use PHPUnit\Framework\TestCase;
class CalculsCanevasTest extends TestCase
{
    public function test_recalcul_borne_sans_resultat_fabrique(): void
    {
        $source = ['parties' => [['blocs' => [['lignes' => [[
            ['cle'=>'a','adresse'=>'A1','texte'=>''], ['cle'=>'b','adresse'=>'B1','texte'=>''],
            ['cle'=>'c','adresse'=>'C1','texte'=>'999','calcul'=>['gauche'=>'A1','droite'=>'B1','operateur'=>'*']],
        ]]]]]]];
        $service = new CalculsCanevasService;
        $this->assertSame('6', $service->recalculer($source, ['a'=>'2','b'=>'3','c'=>'999'])['c']);
        $this->assertSame('100', $service->recalculer($source, ['a'=>'25','b'=>'4'])['c']);
        $this->assertSame('10', $service->recalculer($source, ['a'=>'2,5','b'=>'4'])['c']);
        $this->assertSame('', $service->recalculer($source, ['a'=>'','b'=>'4'])['c']);
        $this->assertSame('0', $service->recalculer($source, ['a'=>'0','b'=>'4'])['c']);
        $source['parties'][0]['blocs'][0]['lignes'][0][2]['calcul']['operateur'] = '-';
        $this->assertSame('-2', $service->recalculer($source, ['a'=>'5','b'=>'7'])['c']);
        $source['parties'][0]['blocs'][0]['lignes'][0][2]['calcul']['gauche'] = 'C1';
        $this->assertSame('', $service->recalculer($source, ['a'=>'5','b'=>'7'])['c']);
    }
}

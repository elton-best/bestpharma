<?php

namespace Tests\Unit;

use App\Services\EmpreinteDocumentService;
use PHPUnit\Framework\TestCase;

class EmpreinteDocumentTest extends TestCase
{
    public function test_copie_deterministe_liee_au_contenu_et_a_la_version(): void
    {
        $doc = (object) ['id' => 'doc-test', 'officine_id' => 'officine-test', 'titre' => 'Procédure témoin',
            'code_document' => 'QAM-PR-TEST', 'type_doc' => 'procedure', 'processus' => 'QAM',
            'version' => 1, 'indice_revision' => 0, 'contenu' => 'Texte témoin éàç'];
        $service = new EmpreinteDocumentService;
        $original = $service->empreinte($doc);
        $this->assertSame(hash('sha256', $service->contenuSigne($doc)), $original);
        $doc->approbateur_nom = 'Valeur étrangère à la copie du contenu';
        $this->assertSame($original, $service->empreinte($doc));
        $doc->contenu = 'Texte modifié';
        $this->assertNotSame($original, $service->empreinte($doc));
        $doc->contenu = 'Texte témoin éàç';
        $doc->version = 2;
        $this->assertNotSame($original, $service->empreinte($doc));
    }
}

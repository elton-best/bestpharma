<?php

namespace App\Services;

class EmpreinteDocumentService
{
    /** Copie textuelle déterministe : les fichiers joints seront traités par la GED versionnée. */
    public function contenuSigne(object $doc): string
    {
        return json_encode([
            'id' => $doc->id, 'officine_id' => $doc->officine_id,
            'code_document' => $doc->code_document, 'titre' => $doc->titre,
            'type_doc' => $doc->type_doc, 'processus' => $doc->processus,
            'version' => (int) $doc->version, 'indice_revision' => (int) $doc->indice_revision,
            'contenu' => $doc->contenu ?? '',
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public function empreinte(object $doc): string
    {
        return hash('sha256', $this->contenuSigne($doc));
    }
}

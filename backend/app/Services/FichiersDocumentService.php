<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class FichiersDocumentService
{
    public function manifeste(object $doc): array
    {
        return DB::table('fichiers_documents')->where('officine_id', $doc->officine_id)
            ->where('document_id', $doc->id)->where('version_document', $doc->version)
            ->where('indice_revision', $doc->indice_revision)->orderBy('numero')
            ->get(['id', 'numero', 'nom_original', 'mime', 'octets', 'sha256'])
            ->map(fn ($f) => ['id' => $f->id, 'numero' => (int) $f->numero,
                'nom_original' => $f->nom_original, 'mime' => $f->mime,
                'octets' => (int) $f->octets, 'sha256' => $f->sha256])->all();
    }
}

<?php
namespace App\Services;

class CatalogueCanevasService
{
    public function tous(): array
    {
        return json_decode(file_get_contents(dirname(__DIR__, 3).'/references/canevas/catalogue.json'), true, 512, JSON_THROW_ON_ERROR)['canevas'];
    }

    public function trouver(string $id): array
    {
        foreach ($this->tous() as $canevas) if ($canevas['id'] === $id) return $canevas;
        abort(404, 'Canevas introuvable.');
    }

    public function champs(array $c): array
    {
        $champs = [];
        $visiter = function ($blocs) use (&$visiter, &$champs) {
            foreach ($blocs as $b) {
                if ($b['type'] === 'paragraphe') $champs[] = $b['cle'];
                else foreach ($b['lignes'] as $ligne) foreach ($ligne as $cellule) {
                    $champs[] = $cellule['cle'];
                    $visiter($cellule['imbriques'] ?? []);
                }
            }
        };
        foreach ($c['parties'] as $partie) $visiter($partie['blocs']);
        return $champs;
    }
}

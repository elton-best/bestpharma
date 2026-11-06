<?php

require dirname(__DIR__).'/backend/app/Services/CatalogueSuivisService.php';
$service = new App\Services\CatalogueSuivisService;
$catalogue = ['formations' => $service->definition('formations'), 'maintenance' => $service->definition('maintenance')];
if (in_array('--check', $argv, true)) {
    $stocke = json_decode(file_get_contents(dirname(__DIR__).'/mock-data/catalogue-suivis.json'), true, 512, JSON_THROW_ON_ERROR);
    if ($stocke !== $catalogue) {
        fwrite(STDERR, "Catalogue de démonstration différent du backend.\n");
        exit(1);
    }
    echo "Catalogue de démonstration aligné sur le backend.\n";
} else {
    echo json_encode($catalogue, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n";
}

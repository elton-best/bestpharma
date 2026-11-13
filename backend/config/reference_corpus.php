<?php
declare(strict_types=1);

return [
    // Mount both resources read-only in containers. No copies in the public disk.
    'catalogue_path' => env('REFERENCE_CORPUS_CATALOGUE_PATH', dirname(base_path()).'/references/canevas/catalogue.json'),
    'source_root' => env('REFERENCE_CORPUS_SOURCE_ROOT', dirname(base_path()).'/0000. DIGIT ABMEB'),
];

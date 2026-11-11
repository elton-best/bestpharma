<?php
declare(strict_types=1);

// Aucun seuil réglementaire n'est présumé. Configurer uniquement après validation métier.
return [
    'zones' => [
        'refrigeree_2_8' => ['label' => 'Enceinte réfrigérée', 'min' => null, 'max' => null, 'severity' => 'critique'],
        'magasin_reserve' => ['label' => 'Magasin / réserve', 'min' => null, 'max' => null, 'severity' => 'majeure'],
        'hall_dispensation' => ['label' => 'Hall de dispensation', 'min' => null, 'max' => null, 'severity' => 'majeure'],
    ],
];

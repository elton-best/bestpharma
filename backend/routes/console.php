<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('bpd:preparer {extraction : Chemin du JSON extrait} {pdf : Chemin du PDF source} {--verifier : Contrôler sans écrire en base}', function () {
    try {
        $extraction = $this->argument('extraction');
        $pdf = $this->argument('pdf');
        if (!is_readable($extraction) || !is_readable($pdf)) {
            throw new \InvalidArgumentException('Les deux fichiers sources doivent être lisibles.');
        }
        $service = app(\App\Services\ImportReferentielBpdService::class);
        if ($this->option('verifier')) {
            $service->verifier(file_get_contents($extraction), file_get_contents($pdf));
            $this->info('Source et structure vérifiées. Aucune écriture en base.');
        } else {
            $resultat = $service->importer(file_get_contents($extraction), file_get_contents($pdf));
            $this->info($resultat['cree'] ? 'Version préparée pour relecture.' : 'Version déjà présente, laissée intacte.');
            $this->line($resultat['id']);
            $this->warn('Aucune activation ni modification des campagnes existantes.');
        }
        return 0;
    } catch (\Throwable $e) {
        $this->error('Préparation refusée : '.$e->getMessage());
        return 1;
    }
})->purpose('Préparer une version du référentiel BPD sans activation automatique');

Artisan::command('ged:importer-corpus {manifeste} {racine} {--officine=} {--operateur=} {--verifier}', function () {
    try {
        $chemin = $this->argument('manifeste');
        if (!is_readable($chemin)) throw new \InvalidArgumentException('Manifeste illisible.');
        $json = file_get_contents($chemin);
        $service = app(\App\Services\ImportCorpusService::class);
        if ($this->option('verifier')) {
            $m = $service->verifier($json, $this->argument('racine'));
            $this->info(count($m['fichiers']).' fichiers sources vérifiés, aucune écriture.');
        } else {
            $officine = $this->option('officine');
            $operateur = $this->option('operateur');
            if (!\Illuminate\Support\Str::isUuid($officine ?? '') || !\Illuminate\Support\Str::isUuid($operateur ?? '')) {
                throw new \InvalidArgumentException('Les options officine et operateur doivent désigner des identifiants existants.');
            }
            $bilan = $service->importer($json, $this->argument('racine'), $officine, $operateur);
            $this->info(json_encode($bilan, JSON_UNESCAPED_UNICODE));
            $this->warn('Sources importées en brouillon. Aucune approbation ni correspondance officielle inventée.');
        }
        return 0;
    } catch (\Throwable $e) {
        $this->error('Import refusé : '.$e->getMessage());
        return 1;
    }
})->purpose('Importer le corpus documentaire en sources privées, sans approbation automatique');

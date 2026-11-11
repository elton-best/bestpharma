<?php
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
Artisan::command('inspire', fn () => Inspiring::quote());

Artisan::command('socle:deliver {--limit=50}', function () {
 $counts=\App\Modules\Identity\Services\Outbox::dispatch((int)$this->option('limit'));
 $this->info('Outbox: '.json_encode($counts));
});
\Illuminate\Support\Facades\Schedule::command('socle:deliver')->everyMinute()->withoutOverlapping();

Artisan::command('socle:remind', function () {
 $this->info(json_encode(\App\Modules\Identity\Services\SocleMaintenance::remind()));
});
Artisan::command('socle:prune {--apply : Delete expired technical tokens only; otherwise dry-run}', function () {
 $this->info(json_encode(\App\Modules\Identity\Services\SocleMaintenance::prune((bool)$this->option('apply'))));
});
\Illuminate\Support\Facades\Schedule::command('socle:remind')->dailyAt('08:00')->withoutOverlapping();

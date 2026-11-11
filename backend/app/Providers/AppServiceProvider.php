<?php

declare(strict_types=1);
namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        RateLimiter::for('identity', fn (Request $request) => Limit::perMinute(20)->by('identity:'.$request->ip()));
        // Explicit namespaces: numeric throttle middleware shares counters across routes.
        RateLimiter::for('auth.login', function (Request $request) {
            $email = is_string($request->input('email')) ? strtolower(trim($request->input('email'))) : '';
            return [
                Limit::perMinute(30)->by('login-ip:'.$request->ip()),
                Limit::perMinute(5)->by('login-account:'.hash('sha256', $email.'|'.$request->ip())),
            ];
        });
        RateLimiter::for('auth.register', fn (Request $request) => Limit::perMinute(3)->by('register:'.$request->ip()));
        RateLimiter::for('invitations.accept', fn (Request $request) => Limit::perMinute(5)->by('accept:'.$request->ip()));
        RateLimiter::for('team.invite', fn (Request $request) => Limit::perMinute(20)->by('invite:'.$request->user()->id));
        RateLimiter::for('platform.review', fn (Request $request) => Limit::perMinute(30)->by('review:'.$request->user()->id));
        // Diagnostic dashboards are deliberately closed until their access policy is reviewed.
        \Laravel\Horizon\Horizon::auth(fn () => false);
        if (class_exists(\Laravel\Telescope\Telescope::class)) {
            \Laravel\Telescope\Telescope::auth(fn () => false);
            // Request/mail/provider diagnostics can contain identity links or MFA secrets.
            // Keep recording closed until a dedicated redaction policy is implemented.
            \Laravel\Telescope\Telescope::stopRecording();
        }
    }
}

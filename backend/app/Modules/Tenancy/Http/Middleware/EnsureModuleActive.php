<?php

declare(strict_types=1);
namespace App\Modules\Tenancy\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleActive
{
    public function handle(Request $request, Closure $next, string $module): Response
    {
        abort_unless(app()->bound('tenant.officine_id'), 403);
        $active = DB::table('officine_modules')->where('officine_id', app('tenant.officine_id'))
            ->where('module', $module)->where('is_active', true)->exists();
        abort_unless($active, 403, 'Ce module n’est pas activé pour cette officine.');
        return $next($request);
    }
}

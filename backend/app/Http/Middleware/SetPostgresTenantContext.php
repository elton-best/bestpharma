<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class SetPostgresTenantContext
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            // 1. Contrôle d'inactivité (NF-05) : verrouillage après inactivité
            $inactivityTimeoutMinutes = 15;
            if ($user->last_activity_at) {
                $idleMinutes = now()->diffInMinutes($user->last_activity_at);
                if ($idleMinutes >= $inactivityTimeoutMinutes) {
                    return response()->json([
                        'message' => 'Session verrouillée après inactivité prolongée. Veuillez vous ré-authentifier.',
                        'code' => 'SESSION_LOCKED_INACTIVITY',
                    ], 423);
                }
            }

            // Met à jour la dernière activité sans déclencher de trigger lourd
            $user->timestamps = false;
            $user->update(['last_activity_at' => now()]);
            $user->timestamps = true;

            // 2. Détermination de l'officine active
            $officineId = $request->header('X-Officine-Id')
                ?? $request->input('officine_id')
                ?? $user->officines()->wherePivot('actif', true)->value('officines.id');

            if ($officineId) {
                $user->officine_id = $officineId;

                // Rôle de l'utilisateur sur cette officine : indispensable aux
                // contrôles d'habilitation (visa pharmacien, promotion, paramètres).
                $role = $user->officines()
                    ->where('officines.id', $officineId)
                    ->value('utilisateurs_officines.role_code');
                $user->role_code = $role;
            }

            // 3. Injection des variables de session PostgreSQL pour RLS et triggers d'audit (set_config supporte les bindings PDO)
            DB::select("SELECT set_config('app.current_user_id', ?, true)", [(string) $user->id]);
            DB::select("SELECT set_config('app.current_user_email', ?, true)", [(string) $user->email]);
            DB::select("SELECT set_config('app.current_ip', ?, true)", [(string) $request->ip()]);
            DB::select("SELECT set_config('app.current_user_agent', ?, true)", [substr($request->userAgent() ?? '', 0, 255)]);
            DB::select("SELECT set_config('app.current_device_id', ?, true)", [substr($request->header('X-Device-Id') ?? '', 0, 100)]);

            if ($officineId) {
                DB::select("SELECT set_config('app.current_officine_id', ?, true)", [(string) $officineId]);
            }
        }

        return $next($request);
    }
}

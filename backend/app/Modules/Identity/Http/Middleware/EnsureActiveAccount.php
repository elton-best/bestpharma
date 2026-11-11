<?php
namespace App\Modules\Identity\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
class EnsureActiveAccount {public function handle(Request $r,Closure $next){$u=Auth::guard('sanctum')->user();abort_if($u&&!$u->is_active,403,'Compte indisponible.');if($u&&\App\Modules\Identity\Services\MfaPolicy::pending($u)){
 $path=$r->path();$allowed=in_array($path,['api/v1/auth/login','api/v1/auth/logout','api/v1/auth/forgot-password','api/v1/auth/reset-password','api/v1/auth/email/verify','api/v1/auth/email/request','api/v1/me','api/v1/auth/providers'],true)||str_starts_with($path,'api/v1/security')||str_starts_with($path,'api/v1/notifications');
 if(!$allowed)return response()->json(['message'=>'Configurez le MFA obligatoire avant de poursuivre.','code'=>'mfa_enrollment_required'],403);
 }return $next($r);}}

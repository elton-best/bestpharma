<?php

declare(strict_types=1);
namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class SessionController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string', 'max:512']]);
        $user = User::query()->where('email', strtolower(trim($data['email'])))->first();
        if (!$user || !$user->is_active || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Identifiants incorrects.']);
        }
        $officines = DB::table('officines')->join('officine_user', 'officines.id', '=', 'officine_user.officine_id')
            ->where('officine_user.user_id', $user->id)->where('officine_user.is_active', true)->select('officines.id', 'officines.name', 'officines.status')->get();
        return response()->json([
            'token' => DB::transaction(function()use($user,$request){$fresh=User::lockForUpdate()->findOrFail($user->id);abort_unless($fresh->is_active&&Hash::check($request->input('password'),$fresh->password),422,'Identifiants incorrects.');if($fresh->mfa_confirmed_at)\App\Modules\Identity\Services\IdentitySecurity::mfa($fresh,$request->input('mfa_code'));return \App\Modules\Identity\Services\IdentitySecurity::token($fresh);}),
            'mfa_enrollment_required'=>\App\Modules\Identity\Services\MfaPolicy::pending($user),'officines' => $officines,
            'is_platform_admin' => (bool) $user->is_platform_admin,
        ])->header('Cache-Control', 'no-store');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();
        return response()->json(['message' => 'Déconnexion effectuée.']);
    }
}

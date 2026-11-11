<?php
namespace App\Modules\Identity\Services;
use App\Models\User;
use Illuminate\Support\Facades\DB;
class MfaPolicy {
 public static function required(User $u):bool {
  if(!config('socle.require_privileged_mfa',true))return false;
  return $u->is_platform_admin||($u->is_support_coordinator&&$u->internal_active)||DB::table('officine_user as m')->join('officines as o','o.id','=','m.officine_id')->where('m.user_id',$u->id)->where('m.is_admin',true)->where('m.is_active',true)->where('o.status','active')->exists();
 }
 public static function pending(User $u):bool{return self::required($u)&&!$u->mfa_confirmed_at;}
}

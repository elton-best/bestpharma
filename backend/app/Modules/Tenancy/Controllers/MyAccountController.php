<?php
declare(strict_types=1);
namespace App\Modules\Tenancy\Controllers;
use App\Http\Controllers\Controller;
use App\Modules\Tenancy\Services\OfficineAccess as Access;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class MyAccountController extends Controller {
 public function show(Request $r) {
  $u=$r->user();$offices=DB::table('officines')->join('officine_user','officines.id','=','officine_user.officine_id')->where('officine_user.user_id',$u->id)->where('officine_user.is_active',true)->select('officines.id','officines.name','officines.status','officine_user.is_admin')->get()->map(function($o){$o->is_admin=(bool)$o->is_admin;$o->access_type='member';return $o;});
  if($u->is_support_staff&&$u->internal_active){$assigned=Access::assignments($u->id)->pluck('officine_id');$extra=DB::table('officines')->whereIn('id',$assigned)->where('status','active')->whereNotIn('id',DB::table('officine_user')->where('user_id',$u->id)->pluck('officine_id'))->get(['id','name','status']);foreach($extra as $o){$o->is_admin=false;$o->access_type='support';$offices->push($o);}}
  return response()->json(['user'=>['mfa_enrollment_required'=>\App\Modules\Identity\Services\MfaPolicy::pending($u),'id'=>$u->id,'name'=>$u->name,'email'=>$u->email,'phone'=>$u->phone,'locale'=>$u->locale,'profile_version'=>$u->profile_version,'email_verified'=>(bool)$u->email_verified_at,'is_support_coordinator'=>(bool)($u->is_support_coordinator&&$u->internal_active)],'officines'=>$offices->sortBy('name')->values()])->header('Cache-Control','no-store');
 }
 public function update(Request $r) {
  $d=$r->validate(['name'=>['required','string','max:150','regex:/\S/u'],'phone'=>['nullable','string','max:40'],'locale'=>['sometimes','in:fr,en'],'profile_version'=>['required','integer','min:1']]);
  DB::transaction(function()use($r,$d){$u=DB::table('users')->where('id',$r->user()->id)->lockForUpdate()->first();abort_unless($u->profile_version===(int)$d['profile_version'],409,'Profil modifié. Rechargez-le.');DB::table('users')->where('id',$u->id)->update(['name'=>trim($d['name']),'phone'=>$d['phone']??null,'locale'=>$d['locale']??$u->locale,'profile_version'=>$u->profile_version+1,'updated_at'=>now()]);});$r->user()->refresh();return $this->show($r);
 }
}

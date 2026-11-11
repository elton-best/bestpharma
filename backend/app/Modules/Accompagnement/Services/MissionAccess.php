<?php
namespace App\Modules\Accompagnement\Services;
use App\Modules\Tenancy\Services\OfficineAccess as Office;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class MissionAccess {
 public static function assignments(Request $r,int $office,bool $write=false,bool $lead=false){
  $q=DB::table('support_mission_team as t')->join('officine_support_assignments as a','a.id','=','t.assignment_id')->where('a.officine_id',$office)->where('a.user_id',$r->user()->id)->where('a.status','approved')->where('a.starts_on','<=',now('Africa/Porto-Novo')->toDateString())->where('a.ends_on','>=',now('Africa/Porto-Novo')->toDateString())->where('t.status','approved');
  if($lead)$q->where('t.role','lead');
  return $q->get(['t.mission_id','a.permissions'])->filter(function($a)use($write){$p=json_decode($a->permissions,true)?:[];return in_array('accompagnement.read',$p,true)&&(!$write||in_array('accompagnement.write',$p,true));})->pluck('mission_id');
 }
 public static function allowed(Request $r,int $office,int $mission,bool $write=false,bool $lead=false):bool{
  // Office admins may read, but do not become an operational lead automatically.
  if(!$write&&$r->attributes->get('officine.is_admin')===true)return true;
  if(!$r->user()->is_support_staff||!$r->user()->internal_active)return false;
  return self::assignments($r,$office,$write,$lead)->contains($mission);
 }
 public static function lockOffice(Request $r,int $office):void{
  $o=DB::table('officines')->where('id',$office)->lockForUpdate()->first();abort_unless($o&&$o->status==='active',403);
  $membership=DB::table('officine_user')->where('officine_id',$office)->where('user_id',$r->user()->id)->first();abort_if($membership&&!$membership->is_active,403);$r->attributes->set('officine.is_admin',$membership?(bool)$membership->is_admin:false);
 }
 public static function event(Request $r,object $m,int $office,string $action,string $reason):void{
  DB::table('support_missions')->where('id',$m->id)->update(['version'=>$m->version+1,'updated_at'=>now()]);
  DB::table('support_mission_events')->insert(['mission_id'=>$m->id,'user_id'=>$r->user()->id,'action'=>$action,'version'=>$m->version+1,'reason'=>$reason,'created_at'=>now()]);
  Office::audit($r,$office,'support.mission.'.$action,['request_id'=>$m->support_request_id,'version'=>$m->version+1]);
 }
}

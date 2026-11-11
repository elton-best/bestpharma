<?php
namespace App\Modules\Accompagnement\Controllers;
use App\Http\Controllers\Controller;
use App\Modules\Accompagnement\Services\MissionAccess;
use App\Modules\Tenancy\Services\OfficineAccess as Office;
use App\Modules\Identity\Services\Outbox;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class MissionWorkspaceController extends Controller {
 private function mission(int $office,string $id){return DB::table('support_missions as m')->join('support_requests as r','r.id','=','m.support_request_id')->where('r.officine_id',$office)->where('m.id',$id)->select('m.*')->first();}
 public function index(Request $r){$office=(int)app('tenant.officine_id');$r->validate(['page'=>['sometimes','integer','min:1']]);$q=DB::table('support_missions as m')->join('support_requests as r','r.id','=','m.support_request_id')->where('r.officine_id',$office);
  if($r->attributes->get('officine.is_admin')!==true){if(!$r->user()->is_support_staff||!$r->user()->internal_active)$q->whereRaw('1=0');else $q->whereIn('m.id',MissionAccess::assignments($r,$office));}
  return response()->json($q->select('m.*')->orderByDesc('m.id')->paginate(25))->header('Cache-Control','no-store');
 }
 public function show(Request $r,string $id){$office=(int)app('tenant.officine_id');return DB::transaction(function()use($r,$office,$id){MissionAccess::lockOffice($r,$office);$m=$this->mission($office,$id);abort_unless($m&&MissionAccess::allowed($r,$office,$m->id),404);return response()->json(['mission'=>$m,'team'=>$this->teamRows($m->id),'events'=>DB::table('support_mission_events')->where('mission_id',$m->id)->orderByDesc('version')->get(),'can_admin'=>$r->attributes->get('officine.is_admin')===true,'can_lead'=>MissionAccess::allowed($r,$office,$m->id,true,true)])->header('Cache-Control','no-store');});}
 public function transition(Request $r,string $id){$office=(int)app('tenant.officine_id');$d=$r->validate(['version'=>['required','integer','min:1'],'action'=>['required','in:start,suspend,resume'],'reason'=>['required','string','max:2000','regex:/\S/u'],'confirmed'=>['required','accepted']]);
  DB::transaction(function()use($r,$office,$id,$d){MissionAccess::lockOffice($r,$office);$m=$this->mission($office,$id);abort_unless($m&&MissionAccess::allowed($r,$office,$m->id,true,true),404);$m=DB::table('support_missions')->where('id',$m->id)->lockForUpdate()->first();abort_unless($m->version===(int)$d['version'],409,'Version périmée.');
   $expected=['start'=>'accepted','suspend'=>'active','resume'=>'suspended'];abort_unless($m->status===$expected[$d['action']],409,'Transition incompatible.');
   if($d['action']!=='suspend')abort_unless($m->starts_on<=now('Africa/Porto-Novo')->toDateString()&&$m->ends_on>=now('Africa/Porto-Novo')->toDateString(),409,'Mission hors période prévue.');
   DB::table('support_missions')->where('id',$m->id)->update(['status'=>$d['action']==='suspend'?'suspended':'active']);MissionAccess::event($r,$m,$office,$d['action'],trim($d['reason']));Outbox::office($office,'mission:'.$m->id.':'.($m->version+1),'État de votre mission','Une transition de mission a été enregistrée. Consultez votre espace.');
  });return response()->json(['message'=>'Transition enregistrée. Aucun accès supplémentaire accordé.']);
 }
 private function teamRows(int $mission){return DB::table('support_mission_team as t')->join('officine_support_assignments as a','a.id','=','t.assignment_id')->join('users as u','u.id','=','a.user_id')->where('t.mission_id',$mission)->select('t.id','t.assignment_id','t.role','t.status','t.version','t.reason','u.name','a.status as assignment_status','a.starts_on','a.ends_on','a.permissions')->get()->map(function($row){$row->permissions=json_decode($row->permissions,true);return $row;});}
 private function central(Request $r,string $requestId):array{
  abort_unless($r->user()->is_support_coordinator&&$r->user()->internal_active&&$r->user()->mfa_confirmed_at,403);
  $row=DB::table('support_requests')->where('id',$requestId)->where('status','submitted')->first();abort_unless($row,404);$o=DB::table('officines')->where('id',$row->officine_id)->where('status','active')->first();abort_unless($o,404);$m=DB::table('support_missions')->where('support_request_id',$row->id)->first();abort_unless($m&&in_array($m->status,['accepted','active','suspended'],true),409,'Mission non acceptée.');return [$row,$m];
 }
 public function centralTeam(Request $r,string $requestId){[$row,$m]=$this->central($r,$requestId);return response()->json(['mission_id'=>$m->id,'version'=>$m->version,'officine_id'=>$row->officine_id,'team'=>$this->teamRows($m->id)])->header('Cache-Control','no-store');}
 public function proposeMember(Request $r,string $requestId){[$row,$m]=$this->central($r,$requestId);$d=$r->validate(['version'=>['required','integer','min:1'],'assignment_id'=>['required','integer','min:1'],'role'=>['required','in:lead,member'],'confirmed'=>['required','accepted']]);
  DB::transaction(function()use($r,$row,$m,$d){DB::table('officines')->where('id',$row->officine_id)->lockForUpdate()->first();[$row,$m]=$this->central($r,(string)$row->id);abort_unless($m->version===(int)$d['version'],409);
   $a=DB::table('officine_support_assignments')->where('id',$d['assignment_id'])->where('officine_id',$row->officine_id)->whereIn('status',['pending','approved'])->first();abort_unless($a,404);$p=json_decode($a->permissions,true)?:[];abort_unless(in_array('accompagnement.read',$p,true)&&($d['role']!=='lead'||in_array('accompagnement.write',$p,true)),422,'Portée M1 insuffisante.');
   abort_if(DB::table('support_mission_team')->where('mission_id',$m->id)->where('assignment_id',$a->id)->exists(),409,'Cette affectation est déjà liée.');
   DB::table('support_mission_team')->insert(['mission_id'=>$m->id,'assignment_id'=>$a->id,'role'=>$d['role'],'proposed_by'=>$r->user()->id,'created_at'=>now(),'updated_at'=>now()]);MissionAccess::event($r,$m,$row->officine_id,'team_proposed','Approbation de l’officine requise.');Outbox::office($row->officine_id,'mission-team:'.$m->id.':'.($m->version+1),'Équipe de mission proposée','Une participation attend votre approbation. Les droits M1 restent nécessaires.');
  });return response()->json(['message'=>'Participation proposée, sans accès avant approbation.'],201);
 }
 public function decideMember(Request $r,string $id,string $memberId){$office=Office::admin($r);$d=$r->validate(['version'=>['required','integer','min:1'],'decision'=>['required','in:approved,refused,revoked'],'reason'=>['required','string','max:2000','regex:/\S/u'],'confirmed'=>['required','accepted']]);
  DB::transaction(function()use($r,$office,$id,$memberId,$d){Office::lockAdmin($r,$office);$m=$this->mission($office,$id);abort_unless($m,404);$t=DB::table('support_mission_team')->where('mission_id',$id)->where('id',$memberId)->lockForUpdate()->first();abort_unless($t,404);abort_unless($t->version===(int)$d['version'],409);$a=DB::table('officine_support_assignments')->where('id',$t->assignment_id)->where('officine_id',$office)->first();abort_unless($a,404);abort_if($a->user_id===$r->user()->id,403,'Auto-approbation interdite.');
   abort_unless(($t->status==='pending'&&in_array($d['decision'],['approved','refused'],true))||($t->status==='approved'&&$d['decision']==='revoked'),409);
   if($d['decision']==='approved'){abort_unless($a->status==='approved'&&$a->starts_on<=now('Africa/Porto-Novo')->toDateString()&&$a->ends_on>=now('Africa/Porto-Novo')->toDateString(),409,'Approbation M1 active requise.');if($t->role==='lead')abort_if(DB::table('support_mission_team')->where('mission_id',$id)->where('status','approved')->where('role','lead')->exists(),409,'Un responsable est déjà approuvé.');}
   DB::table('support_mission_team')->where('id',$t->id)->update(['status'=>$d['decision'],'version'=>$t->version+1,'reason'=>trim($d['reason']),'decided_by'=>$r->user()->id,'updated_at'=>now()]);MissionAccess::event($r,$m,$office,'team_'.$d['decision'],trim($d['reason']));
  });return response()->json(['message'=>'Participation mise à jour. La portée M1 reste contrôlée à chaque requête.']);
 }
}

<?php
namespace App\Modules\Accompagnement\Controllers;
use App\Http\Controllers\Controller;
use App\Modules\Tenancy\Services\OfficineAccess as Access;
use App\Modules\Identity\Services\Outbox;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class SupportMissionController extends Controller {
 public function propose(Request $r,string $id){
  abort_unless($r->user()->is_support_coordinator&&$r->user()->mfa_confirmed_at,403);
  $d=$r->validate(['version'=>['required','integer','min:1'],'title'=>['required','string','max:180','regex:/\S/u'],'scope'=>['required','string','max:5000','regex:/\S/u'],'starts_on'=>['required','date_format:Y-m-d','after_or_equal:today'],'ends_on'=>['required','date_format:Y-m-d','after_or_equal:starts_on']]);
  return DB::transaction(function()use($r,$id,$d){
   $office=DB::table('support_requests')->where('id',$id)->value('officine_id');abort_unless($office,404);
   $o=DB::table('officines')->where('id',$office)->lockForUpdate()->first();abort_unless($o&&$o->status==='active',404);
   $row=DB::table('support_requests')->where('id',$id)->lockForUpdate()->first();abort_unless($row&&$row->status==='submitted',404);
   abort_unless($row->version===(int)$d['version']&&$row->qualification==='ready',409,'Demande périmée ou non prête pour une proposition.');
   abort_if(DB::table('support_missions')->where('support_request_id',$id)->exists(),409,'Une proposition existe déjà pour cette demande.');
   $mission=DB::table('support_missions')->insertGetId(['support_request_id'=>$id,'proposed_by'=>$r->user()->id,'title'=>trim($d['title']),'scope'=>trim($d['scope']),'starts_on'=>$d['starts_on'],'ends_on'=>$d['ends_on'],'created_at'=>now(),'updated_at'=>now()]);
   DB::table('support_requests')->where('id',$id)->update(['version'=>$row->version+1,'updated_at'=>now()]);
   Access::audit($r,(int)$office,'support.mission.proposed',['request_id'=>(int)$id,'version'=>1]);
   Outbox::office((int)$office,'support-mission:'.$mission.':proposed','Proposition de mission','Une proposition attend votre décision explicite. Aucun accès aux données n’est accordé.');
   return response()->json(['id'=>$mission],201);
  });
 }
 public function decide(Request $r,string $id){
  $office=Access::admin($r);
  $d=$r->validate(['version'=>['required','integer','min:1'],'decision'=>['required','in:accepted,refused'],'reason'=>['nullable','required_if:decision,refused','string','max:2000','regex:/\S/u'],'confirmed'=>['required','accepted']]);
  DB::transaction(function()use($r,$office,$id,$d){
   Access::lockAdmin($r,$office);
   $row=DB::table('support_requests')->where('id',$id)->where('officine_id',$office)->lockForUpdate()->first();abort_unless($row,404);
   $m=DB::table('support_missions')->where('support_request_id',$id)->lockForUpdate()->first();abort_unless($m,404);
   abort_unless($row->status==='submitted'&&$m->status==='proposed'&&$m->version===(int)$d['version'],409,'Proposition déjà décidée, retirée ou périmée.');
   abort_if($d['decision']==='accepted'&&$m->ends_on<now()->toDateString(),409,'La période proposée est dépassée.');
   DB::table('support_missions')->where('id',$m->id)->update(['status'=>$d['decision'],'version'=>$m->version+1,'decided_by'=>$r->user()->id,'decision_reason'=>$d['decision']==='refused'?trim($d['reason']):null,'decided_at'=>now(),'updated_at'=>now()]);
   DB::table('support_requests')->where('id',$id)->update(['version'=>$row->version+1,'updated_at'=>now()]);
   Access::audit($r,$office,'support.mission.'.$d['decision'],['request_id'=>(int)$id,'version'=>$m->version+1]);
   Outbox::push($m->proposed_by,'support-mission:'.$m->id.':decision','Décision sur une proposition','L’officine a enregistré sa décision. Consultez la proposition.',$office);
  });
  return response()->json(['message'=>'Décision enregistrée. Aucun accès aux données accordé.']);
 }
}

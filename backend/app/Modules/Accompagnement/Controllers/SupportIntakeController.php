<?php
namespace App\Modules\Accompagnement\Controllers;
use App\Http\Controllers\Controller;
use App\Modules\Tenancy\Services\OfficineAccess as Access;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class SupportIntakeController extends Controller {
 private function authorizeCoordinator(Request $r):void{abort_unless($r->user()->is_support_coordinator && $r->user()->mfa_confirmed_at,403,'Coordination BEG avec MFA requise.');}
 public function index(Request $r){
  $this->authorizeCoordinator($r);
  $d=$r->validate(['page'=>['sometimes','integer','min:1'],'search'=>['nullable','string','max:180']]);
  $q=DB::table('support_requests as s')->join('officines as o','o.id','=','s.officine_id')->where('s.status','submitted')->where('o.status','active');
  if(!empty($d['search']))$q->where(fn($q)=>$q->where('s.title','like','%'.$d['search'].'%')->orWhere('s.reference','like','%'.$d['search'].'%')->orWhere('o.name','like','%'.$d['search'].'%'));
  $p=$q->select('s.id','s.reference','s.title','s.description','s.contact','s.theme','s.availability','s.urgency','s.status','s.version','s.submitted_at','s.qualification','s.qualification_note','s.qualified_at','o.name as officine_name')->orderByDesc('s.id')->paginate(25);$missions=DB::table('support_missions')->whereIn('support_request_id',$p->pluck('id'))->get()->keyBy('support_request_id');$p->getCollection()->transform(function($row)use($missions){$row->mission=$missions->get($row->id);return $row;});return response()->json($p)->header('Cache-Control','no-store');
 }
 public function qualify(Request $r,string $id){
  $this->authorizeCoordinator($r);
  $d=$r->validate(['version'=>['required','integer','min:1'],'qualification'=>['required','in:ready,needs_information,not_retained'],'note'=>['required','string','max:3000','regex:/\S/u']]);
  DB::transaction(function()use($r,$id,$d){
   $office=DB::table('support_requests')->where('id',$id)->value('officine_id');abort_unless($office,404);
   $o=DB::table('officines')->where('id',$office)->lockForUpdate()->first();abort_unless($o&&$o->status==='active',404);
   $row=DB::table('support_requests')->where('id',$id)->lockForUpdate()->first();abort_unless($row&&$row->status==='submitted',404);
   abort_if(DB::table('support_missions')->where('support_request_id',$id)->exists(),409,'Une proposition existe ; qualification figée.');
   abort_unless($row->version===(int)$d['version'],409,'Version périmée. Actualisez la demande.');
   DB::table('support_requests')->where('id',$id)->update(['qualification'=>$d['qualification'],'qualification_note'=>trim($d['note']),'qualified_by'=>$r->user()->id,'qualified_at'=>now(),'version'=>$row->version+1,'updated_at'=>now()]);
   Access::audit($r,(int)$office,'support.request.qualified',['request_id'=>(int)$id,'version'=>$row->version+1]);
  });
  return response()->json(['message'=>'Qualification enregistrée. Aucune mission démarrée ni accès accordé.']);
 }
}

<?php
namespace App\Modules\Tenancy\Controllers;
use App\Http\Controllers\Controller;
use App\Modules\Tenancy\Services\OfficineAccess as Access;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class AccessJournalController extends Controller {
 private function platform(Request $r):bool{return str_starts_with((string)$r->route()?->getName(),'socle.platform.');}
 private function query(Request $r){
  $d=$r->validate(['action'=>['nullable','string','max:100'],'from'=>['nullable','date_format:Y-m-d'],'to'=>['nullable','date_format:Y-m-d',...($r->filled('from')?['after_or_equal:from']:[])],'page'=>['sometimes','integer','min:1'],'actor'=>['nullable','integer','min:1']]);
  $q=DB::table('tenant_audit_logs as a')->leftJoin('users as u','u.id','=','a.user_id');
  if($this->platform($r)){abort_unless($r->user()->is_platform_admin,403);$q->whereIn('a.action',['journal.platform_exported','application.submitted','application.under_review','application.corrections_requested','application.active','application.rejected','application.resubmitted','officine.state','account.state','internal.member.state','internal.invitation.created','internal.invitation.accepted']);}
  else $q->where('a.officine_id',Access::admin($r))->where(fn($q)=>$q->whereNotIn('a.action',['support.request.draft_created','support.request.draft_saved','support.visit.draft_created','support.visit.draft_cancelled','support.visit.report_draft_created','support.visit.report_draft_saved','support.visit.report_submitted','support.diagnostic.template_draft_created','support.diagnostic.template_draft_saved','support.diagnostic.draft_created','support.diagnostic.draft_saved','support.diagnostic.submitted','support.finding.draft_created','support.finding.draft_saved'])->orWhere('a.user_id',$r->user()->id));
  if(!empty($d['action']))$q->where('a.action',$d['action']);if(!empty($d['actor']))$q->where('a.user_id',$d['actor']);if(!empty($d['from']))$q->where('a.created_at','>=',$d['from'].' 00:00:00');if(!empty($d['to']))$q->where('a.created_at','<=',$d['to'].' 23:59:59');
  return $q;
 }
 private function columns():array{return ['a.id','a.officine_id','a.user_id','u.name as actor','a.action','a.payload','a.created_at'];}
 private function sanitize(object $row):object{
  $payload=json_decode($row->payload??'{}',true);$row->details=is_array($payload)?array_intersect_key($payload,array_flip(['scope','row_count','filters','habilitation_confirmed','changed_fields','request_id','comment_id','document_id','version','from','to','role_id','role_ids','membership_id','invitation_id','assignment_id','target','is_active','active','permissions','before','after','reason'])):[];
  foreach(['before','after'] as $key){if(isset($row->details[$key])&&is_array($row->details[$key]))$row->details[$key]=array_intersect_key($row->details[$key],array_flip(['name','permissions','is_active','is_admin','role_ids','version','status']));}
  if(isset($row->details['filters'])&&is_array($row->details['filters']))$row->details['filters']=array_intersect_key($row->details['filters'],array_flip(['action','from','to','actor']));
  unset($row->payload);$row->result='success';return $row;
 }
 public function index(Request $r){$rows=$this->query($r)->orderByDesc('a.id')->paginate(25,$this->columns());$rows->getCollection()->transform(fn($row)=>$this->sanitize($row));return response()->json($rows)->header('Cache-Control','no-store');}
 private function csvCell(mixed $value):string{$s=(string)($value??'');return preg_match('/^[\s\x00-\x1f]*[=+@-]/u',$s)?"'".$s:$s;}
 public function export(Request $r){
  $r->validate(['confirmation'=>['required','accepted']]);
  $content=DB::transaction(function()use($r){
   $rows=$this->query($r)->orderByDesc('a.id')->limit(5001)->get($this->columns());abort_if($rows->count()>5000,422,'Limitez les filtres à 5 000 événements au maximum. Aucun export partiel ne sera produit.');
   $stream=fopen('php://temp','w+');fwrite($stream,"\xEF\xBB\xBF");fputcsv($stream,['id','date_utc','acteur_id','acteur','action','officine_id','resultat','details'], ';','"','');
   foreach($rows as $row){$e=$this->sanitize($row);fputcsv($stream,array_map(fn($v)=>$this->csvCell($v),[$e->id,$e->created_at,$e->user_id,$e->actor,$e->action,$e->officine_id,$e->result,json_encode($e->details,JSON_UNESCAPED_UNICODE)]),';','"','');}
   rewind($stream);$csv=stream_get_contents($stream);fclose($stream);
   DB::table('tenant_audit_logs')->insert(['officine_id'=>$this->platform($r)?null:Access::admin($r),'user_id'=>$r->user()->id,'action'=>$this->platform($r)?'journal.platform_exported':'journal.exported','payload'=>json_encode(['scope'=>$this->platform($r)?'platform':'officine','row_count'=>$rows->count(),'filters'=>$r->only(['action','from','to','actor'])]),'created_at'=>now(),'updated_at'=>now()]);return $csv;
  });
  return response($content)->header('Content-Type','text/csv; charset=UTF-8')->header('Content-Disposition','attachment; filename="journal-'.($this->platform($r)?'plateforme':'officine').'-'.now()->format('Ymd-His').'.csv"')->header('Cache-Control','no-store')->header('X-Content-Type-Options','nosniff');
 }
}

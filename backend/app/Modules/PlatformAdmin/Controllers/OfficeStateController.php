<?php
namespace App\Modules\PlatformAdmin\Controllers;
use App\Http\Controllers\Controller;
use App\Modules\Tenancy\Services\OfficineAccess;
use App\Modules\Identity\Services\Outbox;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class OfficeStateController extends Controller {
 public function index(Request $r){abort_unless($r->user()->is_platform_admin,403);return response()->json(['data'=>DB::table('officines')->whereIn('status',['active','suspended','archived'])->orderBy('name')->get(['id','name','status','profile_version'])]);}
 public function update(Request $r,string $id){abort_unless($r->user()->is_platform_admin,403);$d=$r->validate(['status'=>['required','in:active,suspended,archived'],'version'=>['required','integer','min:1'],'reason'=>['required','string','max:2000','regex:/\S/u']]);DB::transaction(function()use($r,$id,$d){$o=DB::table('officines')->where('id',$id)->lockForUpdate()->first();abort_unless($o,404);abort_unless($o->profile_version===(int)$d['version'],409,'Version périmée.');$allowed=['active'=>['suspended','archived'],'suspended'=>['active','archived'],'archived'=>['suspended']];abort_unless(in_array($d['status'],$allowed[$o->status]??[],true),409,'Transition non autorisée. Une officine archivée se restaure en suspension avant réactivation.');DB::table('officines')->where('id',$id)->update(['status'=>$d['status'],'previous_status'=>$o->status,'profile_version'=>$o->profile_version+1,'updated_at'=>now()]);OfficineAccess::audit($r,(int)$id,'officine.state',['from'=>$o->status,'to'=>$d['status'],'reason'=>$d['reason']]);Outbox::office((int)$id,'office-state:'.$id.':'.($o->profile_version+1),'Statut de votre espace modifié','État SaaS : '.$d['status'].'. Motif : '.$d['reason']);});return response()->json(['message'=>'Statut enregistré. Données conservées.']);}
}

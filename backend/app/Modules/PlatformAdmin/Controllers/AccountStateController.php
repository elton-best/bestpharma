<?php
namespace App\Modules\PlatformAdmin\Controllers;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Modules\Identity\Services\Outbox;
class AccountStateController extends Controller {
 private function authorize(Request $r):void {abort_unless($r->user()->is_platform_admin,403);}
 public function index(Request $r){$this->authorize($r);$d=$r->validate(['search'=>['nullable','string','max:120'],'page'=>['sometimes','integer','min:1']]);return response()->json(User::query()->when($d['search']??null,fn($q,$s)=>$q->where(fn($q)=>$q->where('email','like','%'.$s.'%')->orWhere('name','like','%'.$s.'%')))->orderBy('id')->paginate(30,['id','name','email','is_active','account_version','is_platform_admin']));}
 public function update(Request $r,string $id){$this->authorize($r);$d=$r->validate(['version'=>['required','integer','min:1'],'is_active'=>['required','boolean'],'reason'=>['required','string','max:2000','regex:/\S/u']]);DB::transaction(function()use($r,$id,$d){
  // Serialize privileged state transitions, preventing last-admin races.
  $admins=User::where('is_platform_admin',true)->orderBy('id')->lockForUpdate()->get();
  $actor=$admins->firstWhere('id',$r->user()->id);abort_unless($actor&&$actor->is_active,403);
  $u=User::lockForUpdate()->findOrFail($id);abort_if($u->id===$actor->id,409,'Vous ne pouvez pas modifier votre propre état global.');abort_unless((int)$u->account_version===(int)$d['version'],409,'Version périmée.');abort_if($u->is_active===$d['is_active'],409,'État inchangé.');
  if(!$d['is_active']){abort_if($u->is_platform_admin&&$admins->where('is_active',true)->count()<=1,409,'Dernier administrateur actif.');
   $memberships=DB::table('officine_user')->where('user_id',$u->id)->where('is_active',true)->where('is_admin',true)->orderBy('officine_id')->get();
   foreach($memberships as $m){DB::table('officines')->where('id',$m->officine_id)->lockForUpdate()->first();$other=DB::table('officine_user as m')->join('users as u','u.id','=','m.user_id')->where('m.officine_id',$m->officine_id)->where('m.is_admin',true)->where('m.is_active',true)->where('u.is_active',true)->where('u.id','!=',$u->id)->exists();abort_unless($other,409,'Réaffectez l’administration des officines avant de désactiver ce compte.');}
  }
  $u->forceFill(['is_active'=>$d['is_active'],'account_version'=>$u->account_version+1])->save();
  $u->tokens()->delete();DB::table('identity_tokens')->where('user_id',$u->id)->whereNull('consumed_at')->update(['consumed_at'=>now()]);
  DB::table('tenant_audit_logs')->insert(['user_id'=>$actor->id,'action'=>'account.state','payload'=>json_encode(['target'=>$u->id,'is_active'=>$d['is_active'],'reason'=>trim($d['reason']),'version'=>$u->account_version]),'created_at'=>now(),'updated_at'=>now()]);
  Outbox::push($u->id,'account-state:'.$u->id.':'.$u->account_version,'État de votre compte modifié',$d['is_active']?'Votre compte a été réactivé. Reconnectez-vous.':'Votre compte a été désactivé. Contactez l’administration.');
 });return response()->json(['message'=>'État du compte enregistré. Sessions révoquées.']);}
}

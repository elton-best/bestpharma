<?php
namespace App\Modules\Tenancy\Controllers;
use App\Http\Controllers\Controller;
use App\Modules\Tenancy\Services\OfficineAccess as Access;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class ModuleSummaryController extends Controller {
 public function show(Request $r){
  $d=$r->validate(['days'=>['sometimes','integer','in:7,30,90']]);$days=(int)($d['days']??30);$since=now()->subDays($days);$platform=$r->routeIs('socle.platform.summary');
  if($platform){abort_unless($r->user()->is_platform_admin,403);$q=DB::table('officines');
   $counts=['pending'=> (clone $q)->where('status','pending')->count(),'under_review'=>(clone $q)->where('status','under_review')->count(),'corrections_requested'=>(clone $q)->where('status','corrections_requested')->count(),'active'=>(clone $q)->where('status','active')->count(),'suspended'=>(clone $q)->where('status','suspended')->count(),'archived'=>(clone $q)->where('status','archived')->count(),'old_pending'=>(clone $q)->whereIn('status',['pending','under_review'])->where('submitted_at','<=',now()->subDays(config('socle.reminder_days',3)))->count(),'period_submitted'=>(clone $q)->where('status','!=','draft')->where('submitted_at','>=',$since)->count()];
   $invitations=DB::table('officine_invitations');$support=DB::table('officine_support_assignments');
  }else{$id=Access::admin($r);$counts=['members_active'=>DB::table('officine_user as m')->join('users as u','u.id','=','m.user_id')->where('m.officine_id',$id)->where('m.is_active',true)->where('u.is_active',true)->count(),'period_joined'=>DB::table('officine_user')->where('officine_id',$id)->where('created_at','>=',$since)->count()];$invitations=DB::table('officine_invitations')->where('officine_id',$id);$support=DB::table('officine_support_assignments')->where('officine_id',$id);}
  $counts['invitations_pending']=$invitations->whereNull('accepted_at')->whereNull('revoked_at')->where('expires_at','>',now())->count();
  $date=now('Africa/Porto-Novo')->toDateString();$counts['support_pending']=(clone $support)->where('status','pending')->where('created_at','>',now()->subDays(config('socle.support_pending_days',14)))->where('ends_on','>=',$date)->count();
  $live=(clone $support)->join('users as u','u.id','=','officine_support_assignments.user_id')->join('officines as o','o.id','=','officine_support_assignments.officine_id')->where('u.is_active',true)->where('u.internal_active',true)->where('u.is_support_staff',true)->where('o.status','active')->where('officine_support_assignments.status','approved')->where('starts_on','<=',$date)->where('ends_on','>=',$date);
  $counts['support_active']=(clone $live)->count();$counts['support_expiring']=(clone $live)->where('ends_on','<=',now('Africa/Porto-Novo')->addDays(7)->toDateString())->count();
  return response()->json(['scope'=>$platform?'platform':'officine','as_of'=>now()->toIso8601String(),'period'=>['from'=>$since->toIso8601String(),'to'=>now()->toIso8601String(),'days'=>$days],'counts'=>$counts])->header('Cache-Control','no-store');
 }
}

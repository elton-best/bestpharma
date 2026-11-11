<?php
declare(strict_types=1);
namespace App\Modules\Tenancy\Services;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class OfficineAccess {
 public const SUPPORT_PERMISSIONS=['officine.read','qualite.read','accompagnement.read','accompagnement.write'];
 public static function assignments(int $userId) {
  $date=now('Africa/Porto-Novo')->toDateString();
  return DB::table('officine_support_assignments')->where('user_id',$userId)->where('status','approved')->where('starts_on','<=',$date)->where('ends_on','>=',$date);
 }
 public static function admin(Request $r): int {abort_unless($r->attributes->get('officine.is_admin')===true,403,'Administration de l’officine requise.');return (int)app('tenant.officine_id');}
 public static function lockAdmin(Request $r,int $id): object {
  $o=DB::table('officines')->where('id',$id)->lockForUpdate()->firstOrFail();
  abort_unless($o->status==='active'&&DB::table('officine_user')->where('officine_id',$id)->where('user_id',$r->user()->id)->where('is_admin',true)->where('is_active',true)->exists(),403);
  return $o;
 }
 public static function audit(Request $r,int $id,string $action,array $payload=[]): void {DB::table('tenant_audit_logs')->insert(['officine_id'=>$id,'user_id'=>$r->user()->id,'action'=>$action,'payload'=>json_encode($payload),'created_at'=>now(),'updated_at'=>now()]);}
}

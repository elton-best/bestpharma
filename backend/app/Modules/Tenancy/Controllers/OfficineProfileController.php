<?php
declare(strict_types=1);
namespace App\Modules\Tenancy\Controllers;
use App\Http\Controllers\Controller;
use App\Modules\Tenancy\Services\OfficineAccess as Access;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
class OfficineProfileController extends Controller {
 public function show(Request $r) {
  abort_unless($r->attributes->get('officine.access_type')==='member'||in_array('officine.read',$r->attributes->get('officine.permissions',[]),true),403);
  $id=(int)app('tenant.officine_id');$o=DB::table('officines')->where('id',$id)->first(['id','name','slug','status','email','phone','city','address','country','department','contact_name','district','neighborhood','latitude','longitude','profile_version']);
  $o->has_logo=(bool)DB::table('officines')->where('id',$id)->value('logo_path');
  return response()->json(['data'=>$o,'is_admin'=>$r->attributes->get('officine.is_admin')===true,'access_type'=>$r->attributes->get('officine.access_type')]);
 }
 public function update(Request $r) {
  $id=Access::admin($r);$d=$r->validate(['district'=>['nullable','string','max:120'],'neighborhood'=>['nullable','string','max:120'],'latitude'=>['nullable','numeric','between:-90,90'],'longitude'=>['nullable','numeric','between:-180,180'],'profile_version'=>['required','integer','min:1'],'name'=>['required','string','max:150','regex:/\S/u'],'phone'=>['required','string','max:40','regex:/\S/u'],'email'=>['nullable','email','max:254'],'city'=>['required','string','max:120','regex:/\S/u'],'address'=>['required','string','max:500','regex:/\S/u'],'country'=>['required','string','max:80','regex:/\S/u'],'department'=>['required','string','max:120','regex:/\S/u'],'contact_name'=>['required','string','max:150','regex:/\S/u']]);
  DB::transaction(function()use($r,$id,$d){$o=Access::lockAdmin($r,$id);abort_unless($o->profile_version===(int)$d['profile_version'],409,'La fiche a été modifiée. Rechargez-la.');DB::table('officines')->where('id',$id)->update(array_merge($d,['profile_version'=>$o->profile_version+1,'updated_at'=>now()]));Access::audit($r,$id,'officine.profile.updated',['version'=>$o->profile_version+1,'changed_fields'=>array_values(array_keys(array_filter($d,fn($value,$key)=>$key!=='profile_version'&&$value!==($o->$key??null),ARRAY_FILTER_USE_BOTH)))]);});return $this->show($r);
 }
 public function contacts(Request $r) { $id=Access::admin($r);return response()->json(['data'=>DB::table('officine_contacts')->where('officine_id',$id)->orderBy('name')->get()->map(function($c){$c->is_active=(bool)$c->is_active;return $c;})]); }
 public function saveContact(Request $r,?string $contactId=null) {
  $id=Access::admin($r);$d=$r->validate(['name'=>['required','string','max:150','regex:/\S/u'],'function'=>['required','string','max:120','regex:/\S/u'],'phone'=>['nullable','string','max:40'],'email'=>['nullable','email','max:254'],'type'=>['required',Rule::in(['professionnel','urgence','autre'])],'is_active'=>['required','boolean'],'version'=>[$contactId?'required':'sometimes','integer','min:1']]);
  $result=DB::transaction(function()use($r,$id,$d,$contactId){Access::lockAdmin($r,$id);$version=1;if($contactId){$c=DB::table('officine_contacts')->where('officine_id',$id)->where('id',$contactId)->first();abort_unless($c,404);abort_unless($c->version===(int)$d['version'],409,'Contact modifié. Rechargez la liste.');$version=$c->version+1;}
   $values=array_merge($d,['version'=>$version,'updated_at'=>now()]);if($contactId)DB::table('officine_contacts')->where('officine_id',$id)->where('id',$contactId)->update($values);else $contactId=DB::table('officine_contacts')->insertGetId($values+['officine_id'=>$id,'created_at'=>now()]);Access::audit($r,$id,'officine.contact.saved',['contact_id'=>(int)$contactId,'version'=>$version]);return (int)$contactId;});
  return response()->json(['id'=>$result],$contactId?200:201);
 }
 public function history(Request $r) { $id=Access::admin($r);return response()->json(['data'=>DB::table('tenant_audit_logs')->where('officine_id',$id)->whereIn('action',['officine.logo.updated','officine.logo.removed','officine.profile.updated','officine.contact.saved','support.proposed','support.approved','support.refused','support.revoked','officine.state','support.changes_requested','team.role.state','team.role.duplicated','team.invitation.resent','team.role.saved','team.member.updated','team.invitation.created','team.invitation.accepted','team.invitation.revoked'])->latest('id')->limit(100)->get(['id','action','created_at'])]); }
}

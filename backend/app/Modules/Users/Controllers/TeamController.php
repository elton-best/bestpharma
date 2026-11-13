<?php

declare(strict_types=1);
namespace App\Modules\Users\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TeamController extends Controller
{
  public const PERMISSIONS = [
   'qualite.read', 'qualite.write', 'qualite.approve',
   'documents.read', 'documents.write', 'documents.qualify', 'documents.approve', 'documents.manage',
   'personnel.read', 'personnel.write', 'stock.read', 'stock.write',
   'dispensation.read', 'dispensation.write', 'dispensation.dispense',
   'tresorerie.read', 'tresorerie.write',
   'gardes.read', 'gardes.write', 'caisse.read', 'caisse.sell', 'caisse.session.manage', 'caisse.mouvements.write',
  ];
 private function authorizeAdmin(Request $r): int {
  abort_unless($r->attributes->get('officine.is_admin') === true,403,'Administration de l’officine requise.');
  return (int) app('tenant.officine_id');
 }
 private function lockOfficine(int $id, Request $r): void {
  $office=DB::table('officines')->where('id',$id)->lockForUpdate()->firstOrFail();
  // Recheck after lock: a concurrent admin demotion must not authorize a stale request.
  abort_unless($office->status==='active' && DB::table('officine_user')->where('officine_id',$id)->where('user_id',$r->user()->id)->where('is_admin',true)->where('is_active',true)->exists(),403);
 }
 private function roles(int $id, array $ids): void {
  abort_unless(DB::table('officine_roles')->where('officine_id',$id)->where('is_active',true)->whereIn('id',$ids)->count() === count($ids),422,'Un rôle est invalide pour cette officine.');
 }
 private function audit(Request $r,int $id,string $event,array $payload): void {
  $auditId=DB::table('tenant_audit_logs')->insertGetId(['officine_id'=>$id,'user_id'=>$r->user()->id,'action'=>$event,'payload'=>json_encode($payload),'created_at'=>now(),'updated_at'=>now()]);
  \App\Modules\Identity\Services\Outbox::office($id,'team-event:'.$auditId,'Mise à jour des accès de l’officine','Un changement d’équipe ou de rôle a été enregistré. Consultez votre espace autorisé.');
 }
 public function index(Request $r): JsonResponse {
  $id=$this->authorizeAdmin($r);
  $members=DB::table('officine_user')->join('users','users.id','=','officine_user.user_id')->where('officine_id',$id)
   ->select('officine_user.id','users.name','users.email','officine_user.is_admin','officine_user.is_active')->orderBy('users.name')->get();
  foreach($members as $m) {
   $m->is_admin=(bool)$m->is_admin; $m->is_active=(bool)$m->is_active;
   $m->role_ids=DB::table('officine_member_roles')->where('membership_id',$m->id)->pluck('role_id')->all();
  }
  $roles=DB::table('officine_roles')->where('officine_id',$id)->orderBy('name')->get();
  foreach($roles as $role){$role->permissions=json_decode($role->permissions,true);$role->is_active=(bool)$role->is_active;$role->member_count=DB::table('officine_member_roles')->where('role_id',$role->id)->count();}
  $invites=DB::table('officine_invitations')->where('officine_id',$id)->select('id','email','roles','expires_at','accepted_at','revoked_at')->latest('id')->get();
  foreach($invites as $i) $i->roles=json_decode($i->roles,true);
  return response()->json(['members'=>$members,'roles'=>$roles,'invitations'=>$invites]);
 }
 public function saveRole(Request $r,?string $roleId=null): JsonResponse {
  $id=$this->authorizeAdmin($r);
    $data=$r->validate(['description'=>['nullable','string','max:500'],'version'=>[$roleId?'required':'sometimes','integer','min:1'],'name'=>['required','string','max:80','regex:/\S/u'],'permissions'=>['present','array','max:'.count(self::PERMISSIONS)],'permissions.*'=>['string','distinct',Rule::in(self::PERMISSIONS)]]);
  $role=DB::transaction(function()use($r,$id,$data,$roleId){
   $this->lockOfficine($id,$r);
   if($roleId){$old=DB::table('officine_roles')->where('officine_id',$id)->where('id',$roleId)->first();abort_unless($old,404);abort_unless($old->version===(int)$data['version'],409,'Version du rôle périmée.');}
   if($roleId) abort_unless(DB::table('officine_roles')->where('officine_id',$id)->where('id',$roleId)->exists(),404);
   abort_if(DB::table('officine_roles')->where('officine_id',$id)->where('name',trim($data['name']))->when($roleId,fn($q)=>$q->where('id','!=',$roleId))->exists(),422,'Ce nom de rôle existe déjà.');
   $values=['description'=>$data['description']??null,'version'=>$roleId?$old->version+1:1,'name'=>trim($data['name']),'permissions'=>json_encode($data['permissions']),'updated_at'=>now()];
   if($roleId) DB::table('officine_roles')->where('id',$roleId)->where('officine_id',$id)->update($values);
   else $roleId=DB::table('officine_roles')->insertGetId($values+['officine_id'=>$id,'created_at'=>now()]);
   if(isset($old)){foreach(DB::table('officine_member_roles as g')->join('officine_user as m','m.id','=','g.membership_id')->where('g.role_id',$roleId)->where('m.officine_id',$id)->where('m.is_active',true)->pluck('m.user_id')->unique() as $affected){\App\Modules\Identity\Services\Outbox::push($affected,'role-updated:'.$roleId.':'.$values['version'].':'.$affected,'Un de vos rôles a changé','Les autorisations de votre rôle ont été mises à jour. Les droits sont revérifiés à chaque requête.',$id);}}
   $this->audit($r,$id,'team.role.saved',['role_id'=>(int)$roleId,'version'=>$values['version'],'before'=>$roleId&&isset($old)?['name'=>$old->name,'permissions'=>json_decode($old->permissions,true)]:null,'after'=>['name'=>$values['name'],'permissions'=>$data['permissions']]]);
   return (int)$roleId;
  });
  return response()->json(['id'=>$role],$roleId?200:201);
 }
 public function updateMember(Request $r,string $memberId): JsonResponse {
  $id=$this->authorizeAdmin($r);
  $data=$r->validate(['reason'=>['nullable','string','max:2000'],'is_admin'=>['required','boolean'],'is_active'=>['required','boolean'],'role_ids'=>['present','array'],'role_ids.*'=>['integer','distinct']]);
  DB::transaction(function()use($r,$id,$memberId,$data){
   $this->lockOfficine($id,$r); $this->roles($id,$data['role_ids']);
   $member=DB::table('officine_user')->where('officine_id',$id)->where('id',$memberId)->first(); abort_unless($member,404);
   if($member->is_admin && $member->is_active && (!$data['is_admin'] || !$data['is_active'])) {
    abort_unless(DB::table('officine_user as m')->join('users as u','u.id','=','m.user_id')->where('m.officine_id',$id)->where('m.is_admin',true)->where('m.is_active',true)->where('u.is_active',true)->count()>1,409,'Le dernier administrateur actif doit être conservé.');
   }
   if($member->is_active&&!$data['is_active'])abort_unless(trim($data['reason']??'')!=='',422,'Un motif de suspension est requis.');
   DB::table('officine_user')->where('id',$memberId)->update(['is_admin'=>$data['is_admin'],'is_active'=>$data['is_active'],'permissions'=>'[]','updated_at'=>now()]);
   $oldRoleIds=DB::table('officine_member_roles')->where('membership_id',$memberId)->pluck('role_id')->all();
   DB::table('officine_member_roles')->where('membership_id',$memberId)->delete();
   foreach($data['role_ids'] as $role) DB::table('officine_member_roles')->insert(['membership_id'=>$memberId,'role_id'=>$role]);
   \App\Modules\Identity\Services\Outbox::push($member->user_id,'member-update:'.$memberId.':'.bin2hex(random_bytes(12)),'Vos accès à une officine ont changé','Votre statut ou vos rôles ont changé. Consultez votre espace autorisé.',$id);
   $this->audit($r,$id,'team.member.updated',['membership_id'=>(int)$memberId,'before'=>['is_active'=>(bool)$member->is_active,'is_admin'=>(bool)$member->is_admin,'role_ids'=>$oldRoleIds],'after'=>['is_active'=>$data['is_active'],'is_admin'=>$data['is_admin'],'role_ids'=>$data['role_ids']]]+$data);
  });
  return response()->json(['message'=>'Membre mis à jour.']);
 }
 public function invite(Request $r): JsonResponse {
  $id=$this->authorizeAdmin($r);
  if(is_string($r->input('email'))) $r->merge(['email'=>strtolower(trim($r->input('email')))]);
  $data=$r->validate(['email'=>['required','email','max:254'],'is_admin'=>['required','boolean'],'role_ids'=>['present','array'],'role_ids.*'=>['integer','distinct']]);
  $token=Str::random(64);
  DB::transaction(function()use($r,$id,$data,$token){
   $this->lockOfficine($id,$r);$this->roles($id,$data['role_ids']);
   abort_if(DB::table('officine_user')->join('users','users.id','=','officine_user.user_id')->where('officine_id',$id)->where('users.email',$data['email'])->exists(),409,'Cette personne est déjà membre de l’officine.');
   abort_if(DB::table('officine_invitations')->where('officine_id',$id)->where('email',$data['email'])->whereNull('accepted_at')->whereNull('revoked_at')->where('expires_at','>',now())->exists(),409,'Une invitation est déjà en attente pour cette adresse.');
   $invite=DB::table('officine_invitations')->insertGetId(['officine_id'=>$id,'email'=>$data['email'],'token'=>hash('sha256',$token),'roles'=>json_encode(['is_admin'=>$data['is_admin'],'role_ids'=>$data['role_ids']]),'expires_at'=>now()->addDays(config('socle.invitation_days',7)),'created_at'=>now(),'updated_at'=>now()]);
   \App\Modules\Identity\Services\Outbox::push($r->user()->id,'invitation:'.$invite.':1','Invitation à rejoindre une officine',rtrim(config('socle.frontend_url'),'/').'/invitation#token='.$token,$id,$data['email']);
   $this->audit($r,$id,'team.invitation.created',['invitation_id'=>$invite]);
  });
  // Returned ONCE. Email delivery is deliberately not claimed or implemented.
  return response()->json(['invite_token'=>$token,'message'=>'Lien créé et notification préparée. Consultez son état de livraison.'],201)->header('Cache-Control','no-store');
 }
 public function revoke(Request $r,string $inviteId): JsonResponse {
  $id=$this->authorizeAdmin($r);
  DB::transaction(function()use($r,$id,$inviteId){
   $this->lockOfficine($id,$r);
   $invite=DB::table('officine_invitations')->where('officine_id',$id)->where('id',$inviteId)->first();abort_unless($invite,404);
   abort_if($invite->accepted_at || $invite->revoked_at,409,'Cette invitation n’est plus en attente.');
   DB::table('officine_invitations')->where('id',$inviteId)->update(['revoked_at'=>now(),'updated_at'=>now()]);
   \App\Modules\Identity\Services\Outbox::push($r->user()->id,'invitation-revoked:'.$inviteId,'Invitation révoquée','Le lien d’invitation à l’officine a été révoqué et ne peut plus être utilisé.',$id,$invite->email);
   $this->audit($r,$id,'team.invitation.revoked',['invitation_id'=>(int)$inviteId]);
  });return response()->json(['message'=>'Invitation révoquée.']);
 }

 public function roleState(Request $r,string $roleId): JsonResponse {
  $id=$this->authorizeAdmin($r);$d=$r->validate(['is_active'=>['required','boolean'],'version'=>['required','integer','min:1']]);
  DB::transaction(function()use($r,$id,$roleId,$d){$this->lockOfficine($id,$r);$role=DB::table('officine_roles')->where('officine_id',$id)->where('id',$roleId)->first();abort_unless($role,404);abort_unless($role->version===(int)$d['version'],409,'Version périmée.');if(!$d['is_active'])abort_if(DB::table('officine_member_roles')->where('role_id',$roleId)->exists(),409,'Réaffectez les membres avant de désactiver le rôle.');DB::table('officine_roles')->where('id',$roleId)->update(['is_active'=>$d['is_active'],'version'=>$role->version+1,'updated_at'=>now()]);$this->audit($r,$id,'team.role.state',['role_id'=>(int)$roleId,'is_active'=>$d['is_active']]);});return response()->json(['message'=>'État du rôle enregistré.']);
 }
 public function duplicateRole(Request $r,string $roleId): JsonResponse {
  $id=$this->authorizeAdmin($r);$d=$r->validate(['name'=>['required','string','max:80','regex:/\S/u']]);
  $new=DB::transaction(function()use($r,$id,$roleId,$d){$this->lockOfficine($id,$r);$role=DB::table('officine_roles')->where('officine_id',$id)->where('id',$roleId)->first();abort_unless($role,404);abort_if(DB::table('officine_roles')->where('officine_id',$id)->where('name',trim($d['name']))->exists(),422,'Nom déjà utilisé.');$new=DB::table('officine_roles')->insertGetId(['officine_id'=>$id,'name'=>trim($d['name']),'description'=>$role->description,'permissions'=>$role->permissions,'created_at'=>now(),'updated_at'=>now()]);$this->audit($r,$id,'team.role.duplicated',['role_id'=>$new,'source_id'=>$role->id]);return $new;});return response()->json(['id'=>$new],201);
 }
 public function resend(Request $r,string $inviteId): JsonResponse {
  $id=$this->authorizeAdmin($r);$token=Str::random(64);DB::transaction(function()use($r,$id,$inviteId,$token){$this->lockOfficine($id,$r);$i=DB::table('officine_invitations')->where('officine_id',$id)->where('id',$inviteId)->lockForUpdate()->first();abort_unless($i,404);abort_if($i->accepted_at||$i->revoked_at,409,'Invitation terminée.');DB::table('officine_invitations')->where('id',$inviteId)->update(['token'=>hash('sha256',$token),'expires_at'=>now()->addDays(config('socle.invitation_days',7)),'delivery_version'=>$i->delivery_version+1,'updated_at'=>now()]);\App\Modules\Identity\Services\Outbox::push($r->user()->id,'invitation:'.$inviteId.':'.($i->delivery_version+1),'Nouvelle invitation',rtrim(config('socle.frontend_url'),'/').'/invitation#token='.$token,$id,$i->email);$this->audit($r,$id,'team.invitation.resent',['invitation_id'=>(int)$inviteId]);});return response()->json(['invite_token'=>$token])->header('Cache-Control','no-store');
 }
}

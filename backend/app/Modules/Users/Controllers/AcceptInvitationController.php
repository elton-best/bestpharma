<?php

declare(strict_types=1);
namespace App\Modules\Users\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;

class AcceptInvitationController extends Controller
{
 public function __invoke(Request $r): JsonResponse {
  if(is_string($r->input('email'))) $r->merge(['email'=>strtolower(trim($r->input('email')))]);
  $data=$r->validate(['token'=>['required','string','size:64'],'email'=>['required','email'],'name'=>['nullable','string','max:120'],'password'=>['nullable','confirmed',Password::min(12)->letters()->numbers(),'max:128']]);
  $authenticated=Auth::guard('sanctum')->user();
  return DB::transaction(function()use($r,$data,$authenticated){
   $hash=hash('sha256',$data['token']);
   $lookup=DB::table('officine_invitations')->where('token',$hash)->first();
   abort_unless($lookup,422,'Invitation invalide ou indisponible.');
   $officine=DB::table('officines')->where('id',$lookup->officine_id)->lockForUpdate()->first();
   $invite=DB::table('officine_invitations')->where('id',$lookup->id)->lockForUpdate()->first();
   abort_unless($officine && $officine->status==='active' && !$invite->accepted_at && !$invite->revoked_at && $invite->expires_at && now()->lt($invite->expires_at),422,'Invitation invalide ou indisponible.');
   abort_unless(hash_equals($invite->email,$data['email']),422,'Cette adresse ne correspond pas à l’invitation.');
   $user=User::where('email',$data['email'])->first();
   if($user) {
    abort_unless($authenticated && $authenticated->id===$user->id,422,'Connectez-vous au compte invité avant d’accepter.');
   } else {
    abort_if($authenticated,422,'Déconnectez-vous avant de créer le compte invité.');
    $r->validate(['name'=>['required','string','max:120','regex:/\S/u'],'password'=>['required','confirmed',Password::min(12)->letters()->numbers(),'max:128']]);
    $user=User::create(['name'=>$data['name'],'email'=>$data['email'],'password'=>$data['password']]);
   }
   abort_unless($user->is_active,403,'Compte indisponible.');
   if(!$user->email_verified_at)$user->forceFill(['email_verified_at'=>now()])->save();
   abort_if(DB::table('officine_user')->where('officine_id',$officine->id)->where('user_id',$user->id)->exists(),409,'Ce compte est déjà membre.');
   $grants=json_decode($invite->roles,true);
   $ids=$grants['role_ids']??[];
   abort_unless(DB::table('officine_roles')->where('officine_id',$officine->id)->where('is_active',true)->whereIn('id',$ids)->count()===count($ids),422,'Un rôle de l’invitation n’existe plus. Demandez une nouvelle invitation.');
   $membership=DB::table('officine_user')->insertGetId(['officine_id'=>$officine->id,'user_id'=>$user->id,'is_admin'=>(bool)($grants['is_admin']??false),'is_active'=>true,'permissions'=>'[]','created_at'=>now(),'updated_at'=>now()]);
   foreach($ids as $role) DB::table('officine_member_roles')->insert(['membership_id'=>$membership,'role_id'=>$role]);
   DB::table('officine_invitations')->where('id',$invite->id)->update(['accepted_at'=>now(),'updated_at'=>now()]);
   DB::table('tenant_audit_logs')->insert(['officine_id'=>$officine->id,'user_id'=>$user->id,'action'=>'team.invitation.accepted','payload'=>json_encode(['invitation_id'=>$invite->id,'membership_id'=>$membership]),'created_at'=>now(),'updated_at'=>now()]);
   \App\Modules\Identity\Services\Outbox::office($officine->id,'invitation-accepted:'.$invite->id,'Invitation acceptée','Une personne invitée a rejoint votre officine.');
   return response()->json(['token'=>$user->createToken('officine-web',['*'],now()->addHours(8))->plainTextToken,'officine_id'=>$officine->id],201)->header('Cache-Control','no-store');
  });
 }
}

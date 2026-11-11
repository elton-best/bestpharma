<?php
declare(strict_types=1);
namespace App\Modules\Identity\Services;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;
class IdentitySecurity {
 public static function issue(User $user,string $purpose,array $context=[],int $minutes=30):string {
  DB::table('identity_tokens')->where('user_id',$user->id)->where('purpose',$purpose)->whereNull('consumed_at')->update(['consumed_at'=>now()]);
  $token=Str::random(64);DB::table('identity_tokens')->insert(['user_id'=>$user->id,'purpose'=>$purpose,'token_hash'=>hash('sha256',$token),'context'=>Crypt::encryptString(json_encode($context)),'expires_at'=>now()->addMinutes($minutes),'created_at'=>now(),'updated_at'=>now()]);return $token;
 }
 public static function consume(string $token,string $purpose,callable $fn):mixed {
  // Lock user first consistently with issuance, password change, and MFA login.
  $lookup=DB::table('identity_tokens')->where('token_hash',hash('sha256',$token))->where('purpose',$purpose)->first();abort_unless($lookup,422,'Lien invalide ou expiré.');
  return DB::transaction(function()use($lookup,$token,$purpose,$fn){$user=User::query()->lockForUpdate()->findOrFail($lookup->user_id);$row=DB::table('identity_tokens')->where('id',$lookup->id)->where('purpose',$purpose)->lockForUpdate()->first();abort_unless($row&&!$row->consumed_at&&now()->lt($row->expires_at),422,'Lien invalide ou expiré.');DB::table('identity_tokens')->where('id',$row->id)->update(['consumed_at'=>now()]);return $fn($user,json_decode(Crypt::decryptString($row->context),true));});
 }
 public static function email(User $user,string $purpose='verify',?string $to=null):void {
  DB::transaction(function()use($user,$purpose,$to){$u=User::query()->lockForUpdate()->findOrFail($user->id);$token=self::issue($u,$purpose,['email'=>$to??$u->email]);$route=$purpose==='reset'?'reset-password':'verify-email';$link=rtrim(config('socle.frontend_url'),'/').'/'.$route.'#token='.$token.'&purpose='.$purpose;
   Outbox::push($u->id,$purpose.':'.hash('sha256',$token),$purpose==='reset'?'Renouveler votre mot de passe':'Vérifier votre adresse email',"Lien personnel temporaire, à usage unique :\n".$link,null,$to);
  });
 }
 public static function mfa(User $user,mixed $code):void {
  if(is_string($code)&&preg_match('/^[a-f0-9]{32}$/',$code)&&$user->mfa_confirmed_at){
   $row=DB::table('mfa_recovery_codes')->where('user_id',$user->id)->where('code_hash',hash('sha256',$code))->lockForUpdate()->first();
   abort_unless($row&&!$row->used_at,422,'Code MFA invalide ou déjà utilisé.');
   DB::table('mfa_recovery_codes')->where('id',$row->id)->update(['used_at'=>now(),'updated_at'=>now()]);
   Outbox::push($user->id,'mfa-recovery-used:'.$row->id,'Code de secours utilisé','Un code de secours a été utilisé. Si vous n’êtes pas à l’origine de cette action, changez votre mot de passe.');return;
  }
  abort_unless(is_string($code)&&preg_match('/^\d{6}$/',$code),422,'Code MFA requis.');
  $g=new Google2FA();$step=$g->verifyKeyNewer(Crypt::decryptString($user->mfa_secret),$code,$user->mfa_last_step??0,1,(int)floor(now()->timestamp/30));
  abort_unless($step!==false,422,'Code MFA invalide ou déjà utilisé.');$user->forceFill(['mfa_last_step'=>$step])->save();
 }
 public static function token(User $user):string {abort_unless($user->is_active,403,'Compte indisponible.');return $user->createToken('officine-web',['*'],now()->addHours(8))->plainTextToken;}
}

<?php
declare(strict_types=1);
namespace App\Modules\Identity\Controllers;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Identity\Services\IdentitySecurity as Security;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
class GoogleIdentityController extends Controller {
 private function enabled():bool{return (bool)(config('services.google.client_id')&&config('services.google.client_secret')&&config('services.google.redirect'));}
 public function availability(){return response()->json(['google_enabled'=>$this->enabled()]);}
 public function start(Request $r){abort_unless($this->enabled(),503,'Google non configuré.');$u=Auth::guard('sanctum')->user();if($r->boolean('link')){abort_unless($u,401);abort_unless(is_string($r->input('current_password'))&&strlen($r->input('current_password'))<=512&&Hash::check($r->input('current_password'),$u->password),422,'Vérification du mot de passe échouée.');if($u->mfa_confirmed_at)DB::transaction(function()use($u,$r){$fresh=User::lockForUpdate()->findOrFail($u->id);Security::mfa($fresh,$r->input('mfa_code'));});}else $u=null;
  // An isolated transient user row is NOT created. State is a signed, encrypted cookie-bound flow.
  $state=Str::random(64);$verifier=Str::random(96);$context=['state'=>$state,'verifier'=>$verifier,'link_user'=>$u?->id,'expires'=>now()->addMinutes(10)->timestamp];
  $cookie=cookie('bestpharma_oauth',encrypt($context),10,'/api/v1/auth/google',null,app()->environment('production'),true,false,'lax');
  $url='https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query(['client_id'=>config('services.google.client_id'),'redirect_uri'=>config('services.google.redirect'),'response_type'=>'code','scope'=>'openid email profile','state'=>$state,'code_challenge'=>rtrim(strtr(base64_encode(hash('sha256',$verifier,true)),'+/','-_'),'='),'code_challenge_method'=>'S256','prompt'=>'select_account']);
  return response()->json(['url'=>$url])->cookie($cookie)->header('Cache-Control','no-store');
 }
 public function callback(Request $r){abort_unless($this->enabled(),503);$front=rtrim(config('socle.frontend_url'),'/').'/google-callback';$forget=cookie()->forget('bestpharma_oauth','/api/v1/auth/google');
  try{$ctx=decrypt((string)$r->cookie('bestpharma_oauth'));abort_unless(is_array($ctx)&&$ctx['expires']>now()->timestamp&&is_string($r->query('state'))&&hash_equals($ctx['state'],$r->query('state')),422,'État invalide.');
   // Consume state in shared cache before any provider exchange; callback replays fail across workers.
   abort_unless(\Illuminate\Support\Facades\Cache::add('oauth-state:'.hash('sha256',$ctx['state']),true,now()->addMinutes(15)),422,'Retour déjà traité.');
   abort_if($r->has('error'),422,'Connexion Google annulée.');$r->validate(['code'=>['required','string','max:4096']]);
   $tokens=Http::asForm()->timeout(10)->post('https://oauth2.googleapis.com/token',['grant_type'=>'authorization_code','code'=>$r->query('code'),'client_id'=>config('services.google.client_id'),'client_secret'=>config('services.google.client_secret'),'redirect_uri'=>config('services.google.redirect'),'code_verifier'=>$ctx['verifier']]);abort_unless($tokens->successful()&&is_string($tokens->json('access_token')),422);
   // Userinfo is fetched directly with the provider-issued access token; no browser claims are trusted.
   $info=Http::withToken($tokens->json('access_token'))->timeout(10)->get('https://openidconnect.googleapis.com/v1/userinfo');$profile=$info->json();abort_unless($info->successful()&&is_array($profile)&&is_string($profile['sub']??null)&&strlen($profile['sub'])>0&&strlen($profile['sub'])<=190&&($profile['email_verified']??false)===true&&filter_var($profile['email']??'',FILTER_VALIDATE_EMAIL),422);
   $code=DB::transaction(function()use($profile,$ctx){$identity=DB::table('auth_identities')->where('provider','google')->where('subject',$profile['sub'])->lockForUpdate()->first();
    if($ctx['link_user']){$u=User::lockForUpdate()->findOrFail($ctx['link_user']);abort_unless($u->is_active,403);abort_if($identity&&$identity->user_id!==$u->id,409);abort_if(DB::table('auth_identities')->where('user_id',$u->id)->where('provider','google')->where('subject','!=',$profile['sub'])->exists(),409);}
    elseif($identity){$u=User::lockForUpdate()->findOrFail($identity->user_id);abort_unless($u->is_active,403);}
    else{abort_if(User::where('email',strtolower($profile['email']))->exists(),409,'Connectez-vous à votre compte existant puis associez Google depuis Sécurité.');$u=User::create(['name'=>Str::limit((string)($profile['name']??'Utilisateur Google'),120,''),'email'=>strtolower($profile['email']),'password'=>Str::random(96)]);$u->forceFill(['email_verified_at'=>now()])->save();}
    if(!$identity)DB::table('auth_identities')->insert(['user_id'=>$u->id,'provider'=>'google','subject'=>$profile['sub'],'created_at'=>now(),'updated_at'=>now()]);
    return Security::issue($u,'google_exchange',[],1);
   });return redirect($front.'#code='.$code)->cookie($forget)->header('Referrer-Policy','no-referrer');
  }catch(\Throwable){return redirect($front.'#error=google_failed')->cookie($forget)->header('Referrer-Policy','no-referrer');}
 }
 public function exchange(Request $r){$d=$r->validate(['code'=>['required','string','size:64'],'mfa_code'=>['nullable','string','max:32']]);return Security::consume($d['code'],'google_exchange',function($u)use($d){if($u->mfa_confirmed_at)Security::mfa($u,$d['mfa_code']??null);return response()->json(['token'=>Security::token($u),'mfa_enrollment_required'=>\App\Modules\Identity\Services\MfaPolicy::pending($u),'is_platform_admin'=>(bool)$u->is_platform_admin])->header('Cache-Control','no-store');});}
 public function unlink(Request $r){abort_unless(is_string($r->input('current_password'))&&strlen($r->input('current_password'))<=512&&Hash::check($r->input('current_password'),$r->user()->password),422,'Mot de passe incorrect.');DB::transaction(function()use($r){$u=User::lockForUpdate()->findOrFail($r->user()->id);if($u->mfa_confirmed_at)Security::mfa($u,$r->input('mfa_code'));DB::table('auth_identities')->where('user_id',$u->id)->where('provider','google')->delete();$u->tokens()->delete();});return response()->json(['message'=>'Google dissocié. Reconnectez-vous.']);}
}

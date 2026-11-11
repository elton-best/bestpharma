<?php
// Local-only disposable browser fixture. Not an HTTP route and never a production seed.
require __DIR__.'/../vendor/autoload.php';
$app=require __DIR__.'/../bootstrap/app.php';$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if(!$app->environment(['local','testing'])){fwrite(STDERR,"Local/testing only.\n");exit(1);}
if(($argv[1]??'')==='create'){
 $email='mfa-browser-'.bin2hex(random_bytes(8)).'@example.test';
 $u=App\Models\User::create(['name'=>'Administrateur fictif de recette MFA','email'=>$email,'password'=>'Fictional12345']);
 $u->forceFill(['is_platform_admin'=>true])->save();
 if(($argv[2]??'')==='--office'){$o=App\Modules\Tenancy\Models\Officine::create(['name'=>'Officine fictive de recette M2','slug'=>'mfa-fixture-'.$u->id,'status'=>'active']);Illuminate\Support\Facades\DB::table('officine_user')->insert(['officine_id'=>$o->id,'user_id'=>$u->id,'is_admin'=>true,'is_active'=>true,'permissions'=>'[]','created_at'=>now(),'updated_at'=>now()]);Illuminate\Support\Facades\DB::table('officine_modules')->insert(['officine_id'=>$o->id,'module'=>'qualite','is_active'=>true]);}
 if(($argv[3]??'')==='--mission'&&isset($o)){
  $u->forceFill(['is_support_staff'=>true])->save();
  $request=Illuminate\Support\Facades\DB::table('support_requests')->insertGetId(['officine_id'=>$o->id,'created_by'=>$u->id,'reference'=>'ACC-FIXTURE-'.$u->id,'request_key'=>'fixture-diagnostic-'.$u->id,'status'=>'submitted']);
  $mission=Illuminate\Support\Facades\DB::table('support_missions')->insertGetId(['support_request_id'=>$request,'proposed_by'=>$u->id,'title'=>'Mission fictive de recette diagnostic','scope'=>'Données de test uniquement','status'=>'active','starts_on'=>now()->subDay()->toDateString(),'ends_on'=>now()->addDays(30)->toDateString()]);
  $assignment=Illuminate\Support\Facades\DB::table('officine_support_assignments')->insertGetId(['officine_id'=>$o->id,'user_id'=>$u->id,'proposed_by'=>$u->id,'scope'=>'Fixture approuvée de recette','permissions'=>json_encode(['accompagnement.read','accompagnement.write']),'status'=>'approved','starts_on'=>now()->subDay()->toDateString(),'ends_on'=>now()->addDays(30)->toDateString(),'request_key'=>'fixture-assignment-'.$u->id,'created_at'=>now(),'updated_at'=>now()]);
  Illuminate\Support\Facades\DB::table('support_mission_team')->insert(['mission_id'=>$mission,'assignment_id'=>$assignment,'role'=>'lead','status'=>'approved','proposed_by'=>$u->id]);
 }
 echo $email;
}elseif(($argv[1]??'')==='disable'&&preg_match('/^mfa-browser-[a-f0-9]{16}@example\.test$/',$argv[2]??'')){
 $u=App\Models\User::where('email',$argv[2])->where('name','Administrateur fictif de recette MFA')->firstOrFail();
 $u->forceFill(['is_active'=>false])->save();$u->tokens()->delete();Illuminate\Support\Facades\DB::table('officines')->where('slug','mfa-fixture-'.$u->id)->update(['status'=>'archived','updated_at'=>now()]);echo "Disposable browser account disabled.\n";
}else{fwrite(STDERR,"Usage: create | disable <fixture-email>\n");exit(1);}

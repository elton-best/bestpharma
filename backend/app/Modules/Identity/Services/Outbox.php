<?php
declare(strict_types=1);
namespace App\Modules\Identity\Services;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
class Outbox {
 public static function push(int $userId,string $key,string $title,string $message,?int $officeId=null,?string $to=null):void {
  $email=$to??DB::table('users')->where('id',$userId)->value('email');
  DB::table('notification_outbox')->insertOrIgnore(['user_id'=>$userId,'officine_id'=>$officeId,'event_key'=>$key,'title'=>$title,'encrypted_message'=>Crypt::encryptString(json_encode(['to'=>$email,'body'=>$message])),'created_at'=>now(),'updated_at'=>now()]);
 }
 public static function office(int $officeId,string $key,string $title,string $message):void {
  $users=DB::table('officine_user')->where('officine_id',$officeId)->where('is_active',true)->where('is_admin',true)->pluck('user_id');
  foreach($users as $id)self::push($id,$key.':'.$id,$title,$message,$officeId);
 }
 public static function dispatch(int $limit=50):array {
  $counts=['sent'=>0,'failed'=>0,'simulated'=>0];
  $ids=DB::table('notification_outbox')->whereIn('status',['pending','failed'])->where('attempts','<',5)->where(fn($q)=>$q->whereNull('retry_at')->orWhere('retry_at','<=',now()))->orderBy('id')->limit(max(1,min($limit,100)))->pluck('id');
  foreach($ids as $id)DB::transaction(function()use($id,&$counts){
   $n=DB::table('notification_outbox')->where('id',$id)->lockForUpdate()->first();if(!$n||!in_array($n->status,['pending','failed'],true)||$n->attempts>=5||($n->retry_at&&now()->lt($n->retry_at)))return;
   // Log/array transports must never expose reset/verification links in logs or claim delivery.
   if(in_array(config('mail.default'),['log','array','failover','roundrobin'],true)){DB::table('notification_outbox')->where('id',$id)->update(['status'=>'simulated','updated_at'=>now()]);$counts['simulated']++;return;}
   try{$data=json_decode(Crypt::decryptString($n->encrypted_message),true);Mail::raw($data['body'],fn($m)=>$m->to($data['to'])->subject($n->title));DB::table('notification_outbox')->where('id',$id)->update(['status'=>'sent','attempts'=>$n->attempts+1,'sent_at'=>now(),'updated_at'=>now()]);$counts['sent']++;}
   catch(\Throwable){DB::table('notification_outbox')->where('id',$id)->update(['status'=>'failed','attempts'=>$n->attempts+1,'retry_at'=>now()->addMinutes(2**($n->attempts+1)),'updated_at'=>now()]);$counts['failed']++;}
  });return $counts;
 }
 public static function localInbox():bool{return app()->environment(['local','testing'])&&config('socle.local_inbox')===true;}
}

<?php
namespace App\Modules\Stock\Controllers;
use App\Http\Controllers\Controller;
use App\Modules\Tenancy\Services\OfficineAccess as Access;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
class StockController extends Controller {
 private const LIMIT=5000;
 private function scope(string $table,int $office){return DB::table($table)->where('officine_id',$office);}
 private function fail(string $message):never{throw ValidationException::withMessages(['stock'=>$message]);}
 private function find(string $table,int $office,mixed $id):object{$row=$this->scope($table,$office)->where('id',$id)->first();abort_unless($row,404);return $row;}
 public function index(Request $r){$office=Access::admin($r);return DB::transaction(function()use($r,$office){Access::lockAdmin($r,$office);return response()->json($this->snapshot($office))->header('Cache-Control','no-store');});}
 private function snapshot(int $office):array{
  foreach(['stock_products','stock_locations','stock_balances','stock_operations'] as $table)if($this->scope($table,$office)->count()>self::LIMIT)$this->fail('Le volume dépasse cette première vue Stock. Une vue paginée serveur est nécessaire ; aucune donnée tronquée n’est affichée.');
  $products=$this->scope('stock_products',$office)->orderBy('id')->get()->map(fn($p)=>['id'=>(string)$p->id,'name'=>$p->name,'code'=>$p->code,'unit'=>$p->unit,'threshold'=>(int)$p->threshold]);
  $locations=$this->scope('stock_locations',$office)->orderBy('id')->get()->map(fn($l)=>['id'=>(string)$l->id,'name'=>$l->name]);
  $lots=DB::table('stock_balances as s')->join('stock_batches as b','b.id','=','s.batch_id')->where('s.officine_id',$office)->orderBy('s.id')->select('s.*','b.product_id','b.batch','b.expiry','b.unit_cost','b.status')->get();
  $byId=$lots->keyBy('id');
  $events=$this->scope('stock_operations',$office)->orderByDesc('revision')->get()->map(function($e)use($byId){$from=$byId->get($e->balance_id);$to=$byId->get($e->target_balance_id);return ['id'=>(string)$e->id,'date'=>gmdate('Y-m-d\TH:i:s\Z',strtotime($e->created_at)),'type'=>$e->type,'lotId'=>$e->balance_id?(string)$e->balance_id:'','quantity'=>(int)$e->quantity,'reason'=>$e->reason,'from'=>$from?(string)$from->location_id:'','to'=>$to?(string)$to->location_id:'','actorId'=>(string)$e->user_id];});
  return ['revision'=>(int)($this->scope('stock_workspaces',$office)->value('revision')??0),'products'=>$products,'locations'=>$locations,'lots'=>$lots->map(fn($l)=>['id'=>(string)$l->id,'productId'=>(string)$l->product_id,'batch'=>$l->batch,'expiry'=>$l->expiry,'locationId'=>(string)$l->location_id,'quantity'=>(int)$l->quantity,'unitCost'=>(int)$l->unit_cost,'status'=>$l->status]),'events'=>$events];
 }
 public function operate(Request $r){
  $office=Access::admin($r);
  $base=$r->validate(['confirmed'=>['required','accepted'],'request_key'=>['required','string','min:16','max:80','regex:/^[A-Za-z0-9-]+$/'],'revision'=>['required','integer','min:0'],'command'=>['required','in:product,location,receipt,transfer,inventory,quarantine,recall,release,waste'],'input'=>['required','array']]);
  $command=$base['command'];$rules=['reason'=>['required','string','max:2000','regex:/\S/u']];
  $text=['required','string','max:180','regex:/\S/u'];$quantity=['required','integer','min:1','max:1000000'];$id=['required','integer','min:1'];
  $rules+=match($command){
   'product'=>['name'=>$text,'code'=>$text,'unit'=>['required','string','max:80','regex:/\S/u'],'threshold'=>['required','integer','min:0','max:1000000']],
   'location'=>['name'=>$text],
   'receipt'=>['productId'=>$id,'locationId'=>$id,'batch'=>$text,'expiry'=>['required','date_format:Y-m-d','after:'.now('Africa/Porto-Novo')->toDateString()],'quantity'=>$quantity,'unitCost'=>['required','integer','min:0','max:1000000000']],
   'transfer'=>['lotId'=>$id,'locationId'=>$id,'quantity'=>$quantity],
   'inventory'=>['lotId'=>$id,'quantity'=>['required','integer','min:0','max:1000000'],'expected'=>['required','integer','min:0','max:1000000']],
   'waste'=>['lotId'=>$id,'quantity'=>$quantity],default=>['lotId'=>$id]
  };
  $d=validator($base['input'],$rules)->validate();foreach($d as $k=>$v)if(is_string($v))$d[$k]=trim($v);ksort($d);
  $fingerprint=hash('sha256',json_encode([$r->user()->id,$command,(int)$base['revision'],$d]));
  return DB::transaction(function()use($r,$office,$base,$command,$d,$fingerprint){
   Access::lockAdmin($r,$office);
   $existing=$this->scope('stock_operations',$office)->where('request_key',$base['request_key'])->first();
   if($existing){abort_unless(hash_equals($existing->fingerprint,$fingerprint),409,'Clé déjà utilisée pour une autre opération.');return response()->json(['revision'=>(int)$existing->revision,'replayed'=>true]);}
   $revision=(int)($this->scope('stock_workspaces',$office)->value('revision')??0);abort_unless($revision===(int)$base['revision'],409,'Le stock a été modifié. Actualisez avant de recommencer.');
   $balanceId=null;$targetId=null;$delta=0;$stamp=['created_at'=>now(),'updated_at'=>now()];
   if($command==='product'){
    $code=mb_strtoupper($d['code']);if($this->scope('stock_products',$office)->where('code',$code)->exists())$this->fail('Code produit déjà utilisé.');
    DB::table('stock_products')->insert(['officine_id'=>$office,'name'=>$d['name'],'code'=>$code,'unit'=>$d['unit'],'threshold'=>$d['threshold']]+$stamp);
   }elseif($command==='location'){
    if($this->scope('stock_locations',$office)->whereRaw('LOWER(name) = ?', [mb_strtolower($d['name'])])->exists())$this->fail('Emplacement déjà utilisé.');
    DB::table('stock_locations')->insert(['officine_id'=>$office,'name'=>$d['name']]+$stamp);
   }elseif($command==='receipt'){
    $this->find('stock_products',$office,$d['productId']);$this->find('stock_locations',$office,$d['locationId']);$batch=mb_strtoupper($d['batch']);
    if($this->scope('stock_batches',$office)->where('product_id',$d['productId'])->where('batch',$batch)->exists())$this->fail('Lot déjà reçu ; réception complémentaire non disponible dans cette tranche.');
    $batchId=DB::table('stock_batches')->insertGetId(['officine_id'=>$office,'product_id'=>$d['productId'],'batch'=>$batch,'expiry'=>$d['expiry'],'unit_cost'=>$d['unitCost'],'status'=>'quarantine']+$stamp);
    $delta=(int)$d['quantity'];$balanceId=DB::table('stock_balances')->insertGetId(['officine_id'=>$office,'batch_id'=>$batchId,'location_id'=>$d['locationId'],'quantity'=>$delta]+$stamp);
   }else{
    $b=$this->find('stock_balances',$office,$d['lotId']);$batch=$this->find('stock_batches',$office,$b->batch_id);$balanceId=$b->id;$today=now('Africa/Porto-Novo')->toDateString();
    if($command==='transfer'){
     $this->find('stock_locations',$office,$d['locationId']);if($batch->status!=='available'||$batch->expiry<=$today)$this->fail('Lot bloqué : périmé, rappelé ou en quarantaine.');
     if((int)$b->location_id===(int)$d['locationId'])$this->fail('Destination identique à la source.');$delta=(int)$d['quantity'];if($delta>$b->quantity)$this->fail('Stock insuffisant.');
     $target=$this->scope('stock_balances',$office)->where('batch_id',$b->batch_id)->where('location_id',$d['locationId'])->first();if($target&&$target->quantity+$delta>1000000)$this->fail('Quantité destination trop élevée.');
     $this->scope('stock_balances',$office)->where('id',$balanceId)->update(['quantity'=>$b->quantity-$delta,'updated_at'=>now()]);
     if($target){$targetId=$target->id;$this->scope('stock_balances',$office)->where('id',$targetId)->update(['quantity'=>$target->quantity+$delta,'updated_at'=>now()]);}else $targetId=DB::table('stock_balances')->insertGetId(['officine_id'=>$office,'batch_id'=>$b->batch_id,'location_id'=>$d['locationId'],'quantity'=>$delta]+$stamp);
    }elseif($command==='inventory'||$command==='waste'){
     if($command==='inventory'){abort_unless((int)$b->quantity===(int)$d['expected'],409,'Quantité attendue périmée.');$delta=(int)$d['quantity']-$b->quantity;}else{$delta=-(int)$d['quantity'];if($b->quantity+$delta<0)$this->fail('Stock insuffisant.');}
     $this->scope('stock_balances',$office)->where('id',$balanceId)->update(['quantity'=>$b->quantity+$delta,'updated_at'=>now()]);
    }else{
     if($command==='release'&&($batch->status!=='quarantine'||$batch->expiry<=$today))$this->fail('Levée impossible : rappel, absence de quarantaine ou péremption.');
     if($command==='quarantine'&&$batch->status==='recalled')$this->fail('Un rappel ne peut pas être rétrogradé.');
     $this->scope('stock_batches',$office)->where('id',$batch->id)->update(['status'=>match($command){'release'=>'available','recall'=>'recalled',default=>'quarantine'},'updated_at'=>now()]);
    }
   }
   $total=DB::table('stock_balances as s')->join('stock_batches as b','b.id','=','s.batch_id')->where('s.officine_id',$office)->selectRaw('COALESCE(SUM(s.quantity * b.unit_cost),0) as total')->first()->total;
   if((float)$total>9007199254740991)$this->fail('La valeur brute dépasse la précision autorisée par cette interface. Opération annulée.');
   $next=$revision+1;DB::table('stock_workspaces')->updateOrInsert(['officine_id'=>$office],['revision'=>$next]);
   DB::table('stock_operations')->insert(['officine_id'=>$office,'user_id'=>$r->user()->id,'request_key'=>$base['request_key'],'fingerprint'=>$fingerprint,'type'=>$command,'balance_id'=>$balanceId,'target_balance_id'=>$targetId,'quantity'=>$delta,'reason'=>$d['reason'],'revision'=>$next,'created_at'=>now()]);
   Access::audit($r,$office,'stock.'.$command,['version'=>$next]);
   return response()->json(['revision'=>$next,'replayed'=>false],201);
  });
 }
}

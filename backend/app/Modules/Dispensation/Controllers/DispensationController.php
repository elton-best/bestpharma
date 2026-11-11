<?php
declare(strict_types=1);
namespace App\Modules\Dispensation\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DispensationController extends Controller
{
    private function office(Request $r): int { return (int) app('tenant.officine_id'); }
    private function scope(string $table, int $office) { return DB::table($table)->where('officine_id', $office); }

    public function index(Request $r): JsonResponse
    {
        $office=$this->office($r);
        $products=$this->scope('stock_products',$office)->orderBy('name')->get(['id','name','code','unit']);
        $lots=DB::table('stock_balances as s')->join('stock_batches as b','b.id','=','s.batch_id')
            ->where('s.officine_id',$office)->where('b.status','available')->whereDate('b.expiry','>',now('Africa/Porto-Novo')->toDateString())
            ->where('s.quantity','>',0)->orderBy('b.expiry')->get(['s.id as balance_id','b.id as batch_id','b.product_id','b.batch','b.expiry','s.quantity']);
        $requests=$this->scope('dispensation_requests',$office)->orderByDesc('id')->limit(50)->get();
        foreach($requests as $q){$q->lines=$this->scope('dispensation_request_lines',$office)->where('request_id',$q->id)->get();}
        return response()->json(['products'=>$products,'lots'=>$lots,'requests'=>$requests,'can_dispense'=>$this->canDispense($r)])->header('Cache-Control','no-store, private');
    }

    public function store(Request $r): JsonResponse
    {
        $v=$r->validate([
            'request_key'=>['required','string','min:16','max:80','regex:/^[A-Za-z0-9-]+$/'],
            'kind'=>['required','in:prescription,non_prescription'],
            'prescription_reference'=>['nullable','string','max:120'], 'prescription_date'=>['nullable','date_format:Y-m-d'],
            'patient_reference'=>['nullable','string','max:120'],
            'lines'=>['required','array','min:1','max:30'], 'lines.*.product_id'=>['required','integer','min:1'],
            'lines.*.quantity'=>['required','integer','min:1','max:1000000'], 'lines.*.dosage_instructions'=>['nullable','string','max:500'],
        ]);
        if($v['kind']==='prescription' && empty($v['prescription_reference']) && empty($v['prescription_date'])) {
            throw ValidationException::withMessages(['prescription_reference'=>'Référence ou date d’ordonnance requise pour une ordonnance.']);
        }
        $office=$this->office($r); $fingerprint=hash('sha256',json_encode([$r->user()->id,$v],JSON_THROW_ON_ERROR));
        return DB::transaction(function()use($r,$v,$office,$fingerprint){
            DB::table('officines')->where('id',$office)->lockForUpdate()->firstOrFail();
            $existing=$this->scope('dispensation_requests',$office)->where('request_key',$v['request_key'])->first();
            if($existing){abort_unless(hash_equals($existing->fingerprint,$fingerprint),409,'Clé de requête déjà utilisée.');return response()->json(['data'=>$existing,'replayed'=>true]);}
            foreach($v['lines'] as $line) abort_unless($this->scope('stock_products',$office)->where('id',$line['product_id'])->exists(),404,'Produit introuvable dans cette officine.');
            $now=now(); $id=DB::table('dispensation_requests')->insertGetId([
                'officine_id'=>$office,'created_by'=>$r->user()->id,'request_key'=>$v['request_key'],'fingerprint'=>$fingerprint,
                'kind'=>$v['kind'],'prescription_reference'=>$v['prescription_reference']??null,'prescription_date'=>$v['prescription_date']??null,
                'patient_reference'=>$v['patient_reference']??null,'status'=>'pending_review','created_at'=>$now,'updated_at'=>$now,
            ]);
            foreach($v['lines'] as $line) DB::table('dispensation_request_lines')->insert([
                'officine_id'=>$office,'request_id'=>$id,'product_id'=>$line['product_id'],'quantity'=>$line['quantity'],
                'dosage_instructions'=>$line['dosage_instructions']??null,'created_at'=>$now,'updated_at'=>$now,
            ]);
            return response()->json(['data'=>$this->scope('dispensation_requests',$office)->where('id',$id)->first(),'replayed'=>false],201);
        });
    }

    public function dispense(Request $r, int $id): JsonResponse
    {
        abort_unless($this->canDispense($r),403,'Permission de délivrance pharmacien requise.');
        $v=$r->validate([
            'confirmed'=>['required','accepted'], 'decision'=>['required','in:dispense'],
            'pharmacist_visa_confirmed'=>['required','accepted'],
            'dispense_key'=>['required','string','min:16','max:80','regex:/^[A-Za-z0-9-]+$/'],
        ]);
        $office=$this->office($r);
        return DB::transaction(function()use($r,$v,$office,$id){
            // One per-office lock serializes concurrent allocations; batch/balance locks defend the ledger too.
            DB::table('officines')->where('id',$office)->lockForUpdate()->firstOrFail();
            $request=$this->scope('dispensation_requests',$office)->where('id',$id)->lockForUpdate()->firstOrFail();
            if($request->status==='dispensed'){
                abort_unless(hash_equals((string)$request->dispense_key,$v['dispense_key']),409,'Cette demande est déjà délivrée avec une autre clé.');
                return response()->json(['data'=>$request,'replayed'=>true]);
            }
            abort_unless($request->status==='pending_review',409,'Demande non délivrable.');
            $lines=$this->scope('dispensation_request_lines',$office)->where('request_id',$id)->orderBy('id')->get();
            foreach($lines as $line){
                $remaining=(int)$line->quantity;
                $lots=DB::table('stock_balances as s')->join('stock_batches as b','b.id','=','s.batch_id')
                    ->where('s.officine_id',$office)->where('b.officine_id',$office)->where('b.product_id',$line->product_id)
                    ->where('b.status','available')->whereDate('b.expiry','>',now('Africa/Porto-Novo')->toDateString())->where('s.quantity','>',0)
                    ->orderBy('b.expiry')->orderBy('b.id')->select('s.id as balance_id','s.quantity','b.id as batch_id')->lockForUpdate()->get();
                if($lots->sum('quantity')<$remaining) throw ValidationException::withMessages(['stock'=>'Stock FEFO admissible insuffisant; la demande reste en attente.']);
                foreach($lots as $lot){ if($remaining===0)break; $take=min($remaining,(int)$lot->quantity);
                    $updated=$this->scope('stock_balances',$office)->where('id',$lot->balance_id)->where('quantity','>=',$take)->decrement('quantity',$take);
                    abort_unless($updated===1,409,'Stock modifié simultanément; recommencez la validation.');
                    DB::table('dispensation_movements')->insert(['officine_id'=>$office,'request_id'=>$id,'request_line_id'=>$line->id,
                        'balance_id'=>$lot->balance_id,'batch_id'=>$lot->batch_id,'user_id'=>$r->user()->id,'quantity'=>$take,
                        'request_key'=>hash('sha256',$v['dispense_key'].'-'.$line->id.'-'.$lot->balance_id),'created_at'=>now()]);
                    $remaining-=$take;
                }
            }
            $this->scope('dispensation_requests',$office)->where('id',$id)->update(['status'=>'dispensed','dispensed_by'=>$r->user()->id,
                'visa_by'=>$r->user()->id,'dispensed_at'=>now(),'dispense_key'=>$v['dispense_key'],'updated_at'=>now()]);
            return response()->json(['data'=>$this->scope('dispensation_requests',$office)->where('id',$id)->first(),'replayed'=>false],201);
        });
    }

    private function canDispense(Request $r): bool
    {
        return (bool)$r->attributes->get('officine.is_admin',false)
            || in_array('dispensation.dispense',(array)$r->attributes->get('officine.permissions',[]),true);
    }
}

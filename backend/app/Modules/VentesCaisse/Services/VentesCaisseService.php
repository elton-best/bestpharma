<?php
declare(strict_types=1);

namespace App\Modules\VentesCaisse\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VentesCaisseService
{
    public function office(): int { return (int) app('tenant.officine_id'); }

    public function open(int $user, int $cash, string $key): array
    {
        return DB::transaction(function () use ($user, $cash, $key) {
            $office=$this->office();
            DB::table('officines')->where('id', $office)->lockForUpdate()->firstOrFail();
            $fingerprint=hash('sha256',json_encode([$user,$cash],JSON_THROW_ON_ERROR));
            $existing=DB::table('pos_sessions')->where('officine_id',$office)->where('open_request_key',$key)->first();
            if($existing){abort_unless($existing->user_id===$user&&hash_equals($existing->open_fingerprint,$fingerprint),409,'Clé d’ouverture déjà utilisée.');return ['session'=>$existing,'replayed'=>true];}
            if (DB::table('pos_sessions')->where('officine_id',$this->office())->where('status','open')->exists()) abort(409,'Une session de caisse est déjà ouverte.');
            $id=DB::table('pos_sessions')->insertGetId(['officine_id'=>$office,'user_id'=>$user,'opening_cash'=>$cash,'open_request_key'=>$key,'open_fingerprint'=>$fingerprint,'status'=>'open','opened_at'=>now(),'created_at'=>now(),'updated_at'=>now()]);
            return ['session'=>DB::table('pos_sessions')->where('id',$id)->first(),'replayed'=>false];
        });
    }

    public function close(int $sessionId, int $cash, ?string $note, string $key): array
    {
        return DB::transaction(function () use ($sessionId,$cash,$note,$key) {
            $office=$this->office();
            DB::table('officines')->where('id',$office)->lockForUpdate()->firstOrFail();
            $s=DB::table('pos_sessions')->where('officine_id',$office)->where('id',$sessionId)->lockForUpdate()->firstOrFail();
            $fingerprint=hash('sha256',json_encode([$cash,$note],JSON_THROW_ON_ERROR));
            if($s->status==='closed') { abort_unless($s->close_request_key===$key&&hash_equals($s->close_fingerprint??'', $fingerprint),409,'Session déjà clôturée.'); return ['session'=>$s,'replayed'=>true]; }
            $movementNet=(int)DB::table('pos_cash_movements')->where('officine_id',$office)->where('session_id',$sessionId)->selectRaw("COALESCE(SUM(CASE WHEN direction = 'entree' THEN amount ELSE -amount END), 0) as total")->value('total');
            $expected=(int)$s->opening_cash+(int)$s->cash_sales+$movementNet;
            DB::table('pos_sessions')->where('officine_id',$office)->where('id',$sessionId)->update(['status'=>'closed','closing_cash'=>$cash,'cash_difference'=>$cash-$expected,'closing_note'=>$note,'close_request_key'=>$key,'close_fingerprint'=>$fingerprint,'closed_at'=>now(),'updated_at'=>now()]);
            return ['session'=>DB::table('pos_sessions')->where('officine_id',$office)->where('id',$sessionId)->first(),'replayed'=>false];
        });
    }

    public function recordCashMovement(int $user, array $data): object
    {
        $office=$this->office();
        return DB::transaction(function () use ($user, $data, $office) {
            DB::table('officines')->where('id',$office)->lockForUpdate()->firstOrFail();
            $session=DB::table('pos_sessions')->where('officine_id',$office)->where('status','open')->lockForUpdate()->first();
            abort_unless($session,409,'Ouvrez une session de caisse avant un mouvement.');
            $now=now();
            $id=DB::table('pos_cash_movements')->insertGetId([
                'officine_id'=>$office,'session_id'=>$session->id,'user_id'=>$user,
                'direction'=>$data['direction'],'category'=>$data['category'],'reason'=>trim($data['reason']),
                'amount'=>$data['amount'],'occurred_at'=>$now,'created_at'=>$now,'updated_at'=>$now,
            ]);
            return DB::table('pos_cash_movements')->where('officine_id',$office)->where('id',$id)->first();
        });
    }

    public function sell(int $user, array $d): array
    {
        if (($d['mode_reglement']??'especes') !== 'especes') abort(response()->json(['code'=>'payment_provider_unavailable','message'=>'Seul le paiement espèces est disponible. Aucun paiement ni vente n’a été créé.'],503));
        $office=$this->office();
        $fingerprint=hash('sha256',json_encode([$user,$d],JSON_THROW_ON_ERROR));
        return DB::transaction(function () use($user,$d,$office,$fingerprint) {
            DB::table('officines')->where('id',$office)->lockForUpdate()->firstOrFail();
            $old=DB::table('pos_sales')->where('officine_id',$office)->where('request_key',$d['request_key'])->first();
            if($old){abort_unless(hash_equals($old->fingerprint,$fingerprint),409,'Clé d’idempotence déjà utilisée.');return $this->receipt($old,true);}
            $session=DB::table('pos_sessions')->where('officine_id',$office)->where('status','open')->lockForUpdate()->first();
            abort_unless($session,409,'Ouvrez une session de caisse avant la vente.');
            $items=[];$total=0;
            foreach($d['lignes'] as $line){
                $product=DB::table('stock_products')->where('officine_id',$office)->where('id',$line['product_id'])->first();
                abort_unless($product,404,'Produit introuvable.');
                abort_unless($product->sale_price!==null,422,'Prix de vente non configuré pour un produit du panier.');
                $left=(int)$line['quantite'];
                $batches=DB::table('stock_balances as b')->join('stock_batches as lot',function($j){$j->on('lot.id','=','b.batch_id')->on('lot.officine_id','=','b.officine_id');})
                    ->where('b.officine_id',$office)->where('lot.product_id',$product->id)->where('lot.status','available')->where('lot.expiry','>',now('Africa/Porto-Novo')->toDateString())->where('b.quantity','>',0)->orderBy('lot.expiry')->orderBy('lot.id')->select('b.*','lot.product_id','lot.status','lot.expiry')->lockForUpdate()->get();
                foreach($batches as $batch){if(!$left)break;$take=min($left,(int)$batch->quantity);$items[]=['product'=>$product,'balance'=>$batch,'quantity'=>$take,'price'=>(int)$product->sale_price];$left-=$take;}
                abort_unless($left===0,422,'Stock disponible insuffisant en lots libérés.');
            }
            foreach($items as $i){$lineTotal=$i['quantity']*$i['price'];abort_if($lineTotal>PHP_INT_MAX-$total,422,'Montant trop élevé.');$total+=$lineTotal;}
            abort_unless((int)$d['montant_recu'] >= $total,422,'Montant espèces insuffisant.');
            $stamp=now();$id=DB::table('pos_sales')->insertGetId(['officine_id'=>$office,'session_id'=>$session->id,'user_id'=>$user,'request_key'=>$d['request_key'],'fingerprint'=>$fingerprint,'receipt_number'=>'INT-'.strtoupper(bin2hex(random_bytes(6))),'customer_name'=>$d['client_nom']??null,'total'=>$total,'cash_received'=>$d['montant_recu'],'change_due'=>$d['montant_recu']-$total,'status'=>'completed','sold_at'=>$stamp,'created_at'=>$stamp,'updated_at'=>$stamp]);
            foreach($items as $i){$q=(int)$i['quantity'];DB::table('stock_balances')->where('officine_id',$office)->where('id',$i['balance']->id)->decrement('quantity',$q,['updated_at'=>$stamp]);DB::table('pos_sale_lines')->insert(['officine_id'=>$office,'sale_id'=>$id,'product_id'=>$i['product']->id,'batch_id'=>$i['balance']->batch_id,'balance_id'=>$i['balance']->id,'quantity'=>$q,'unit_price'=>$i['price'],'line_total'=>$q*$i['price'],'created_at'=>$stamp,'updated_at'=>$stamp]);}
            DB::table('pos_sessions')->where('id',$session->id)->increment('cash_sales',$total,['updated_at'=>$stamp]);
            return $this->receipt(DB::table('pos_sales')->where('id',$id)->first(),false);
        });
    }

    private function receipt(object $s,bool $replayed): array
    {
        return [
            'data'=>['id'=>(string)$s->id,'recu_interne'=>$s->receipt_number,'statut'=>$s->status,'montant_net_ttc'=>(int)$s->total,'montant_recu'=>(int)$s->cash_received,'monnaie_rendue'=>(int)$s->change_due,'facture_emecef'=>null,'lignes'=>DB::table('pos_sale_lines as l')->join('stock_products as p','p.id','=','l.product_id')->where('l.officine_id',$this->office())->where('l.sale_id',$s->id)->select('p.name as produit','l.quantity as quantite','l.unit_price as prix_unitaire','l.line_total as total')->get()],
            'services_externes'=>['paiement'=>'espèces','facturation_fiscale'=>'non_configuree','comptabilite'=>'non_generee'],
            'replayed'=>$replayed,
        ];
    }
}

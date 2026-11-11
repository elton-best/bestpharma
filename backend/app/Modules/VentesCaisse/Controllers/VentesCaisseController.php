<?php
declare(strict_types=1);

namespace App\Modules\VentesCaisse\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\VentesCaisse\Services\VentesCaisseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Modules\Tenancy\Services\OfficineAccess;

class VentesCaisseController extends Controller
{
    public function __construct(private readonly VentesCaisseService $service) {}

    private function authorizeCaisse(Request $r, string $permission): int
    {
        $office=$this->service->office();
        $permissions=(array)$r->attributes->get('officine.permissions',[]);
        abort_unless($r->attributes->get('officine.is_admin')===true || in_array($permission,$permissions,true),403,'Autorisation de caisse insuffisante.');
        return $office;
    }

    public function open(Request $r)
    {
        $this->authorizeCaisse($r,'caisse.session.manage');
        $d=$r->validate(['opening_cash'=>['required','integer','min:0','max:1000000000'],'request_key'=>['required','string','min:16','max:80','regex:/^[A-Za-z0-9-]+$/']]);
        $result=$this->service->open((int)$r->user()->id,$d['opening_cash'],$d['request_key']);
        return response()->json(['data'=>$result['session'],'replayed'=>$result['replayed']],$result['replayed']?200:201);
    }

    public function active(Request $r)
    {
        $permissions=(array)$r->attributes->get('officine.permissions',[]);$admin=$r->attributes->get('officine.is_admin')===true;
        abort_unless($admin||in_array('caisse.read',$permissions,true)||in_array('caisse.sell',$permissions,true)||in_array('caisse.session.manage',$permissions,true),403,'Autorisation de caisse insuffisante.');
        return response()->json(['data'=>DB::table('pos_sessions')->where('officine_id',$this->service->office())->where('status','open')->first(),'can_sell'=>$admin||in_array('caisse.sell',$permissions,true),'can_manage_session'=>$admin||in_array('caisse.session.manage',$permissions,true),'can_manage_movements'=>$admin||in_array('caisse.mouvements.write',$permissions,true)]);
    }

    public function sales(Request $r)
    {
        $this->authorizeCaisse($r,'caisse.read');
        $data=$r->validate(['per_page'=>['sometimes','integer','min:1','max:100'],'page'=>['sometimes','integer','min:1']]);
        $p=DB::table('pos_sales')->where('officine_id',$this->service->office())->select(['id','session_id','user_id','receipt_number','customer_name','total','cash_received','change_due','status','sold_at'])->orderByDesc('sold_at')->orderByDesc('id')->paginate($data['per_page']??25);
        return response()->json($p);
    }

    public function cashMovements(Request $r)
    {
        $office=$this->authorizeCaisse($r,'caisse.read');
        $data=$r->validate(['per_page'=>['sometimes','integer','min:1','max:100'],'page'=>['sometimes','integer','min:1']]);
        $page=DB::table('pos_cash_movements')->where('officine_id',$office)->orderByDesc('occurred_at')->orderByDesc('id')->paginate($data['per_page']??25);
        return response()->json(array_merge($page->toArray(),['can_write'=>$r->attributes->get('officine.is_admin')===true||in_array('caisse.mouvements.write',(array)$r->attributes->get('officine.permissions',[]),true)]));
    }

    public function storeCashMovement(Request $r)
    {
        $this->authorizeCaisse($r,'caisse.mouvements.write');
        $d=$r->validate([
            'direction'=>['required','in:entree,sortie'],
            'category'=>['required','in:apport,retrait,depense,remboursement,autre'],
            'reason'=>['required','string','min:3','max:500','regex:/\\S/u'],
            'amount'=>['required','integer','min:1','max:1000000000'],
        ]);
        abort_unless(($d['direction']==='entree' && in_array($d['category'],['apport','remboursement','autre'],true)) || ($d['direction']==='sortie' && in_array($d['category'],['retrait','depense','autre'],true)),422,'Catégorie incompatible avec le sens du mouvement.');
        $movement=DB::transaction(function () use ($r,$d) {
            $movement=$this->service->recordCashMovement((int)$r->user()->id,$d);
            OfficineAccess::audit($r,(int)app('tenant.officine_id'),'pos.cash_movement.created',['movement_id'=>$movement->id,'direction'=>$movement->direction,'category'=>$movement->category,'amount'=>(int)$movement->amount]);
            return $movement;
        });
        return response()->json(['data'=>$movement],201);
    }

    public function catalog(Request $r)
    {
        $office=$this->authorizeCaisse($r,'caisse.read');
        return response()->json(['data'=>DB::table('stock_products as p')->where('p.officine_id',$office)->orderBy('p.name')->get()->map(function($p)use($office){
            $p->available=(int)DB::table('stock_balances as b')->join('stock_batches as lot',function($j){$j->on('lot.id','=','b.batch_id')->on('lot.officine_id','=','b.officine_id');})->where('b.officine_id',$office)->where('lot.product_id',$p->id)->where('lot.status','available')->where('lot.expiry','>',now('Africa/Porto-Novo')->toDateString())->sum('b.quantity');
            return $p;
        })]);
    }

    public function setPrice(Request $r,int $product)
    {
        $office=OfficineAccess::admin($r);
        $d=$r->validate(['sale_price'=>['required','integer','min:1','max:1000000000']]);
        abort_unless(DB::table('stock_products')->where('officine_id',$office)->where('id',$product)->update(['sale_price'=>$d['sale_price'],'updated_at'=>now()]),404);
        return response()->json(['data'=>['product_id'=>$product,'sale_price'=>$d['sale_price']]]);
    }

    public function close(Request $r,int $session)
    {
        $this->authorizeCaisse($r,'caisse.session.manage');
        $d=$r->validate(['closing_cash'=>['required','integer','min:0','max:1000000000'],'note'=>['nullable','string','max:2000'],'request_key'=>['required','string','min:16','max:80','regex:/^[A-Za-z0-9-]+$/']]);
        $result=$this->service->close($session,$d['closing_cash'],$d['note']??null,$d['request_key']);
        return response()->json(['data'=>$result['session'],'replayed'=>$result['replayed']]);
    }

    public function sell(Request $r)
    {
        $this->authorizeCaisse($r,'caisse.sell');
        $d=$r->validate(['request_key'=>['required','string','min:16','max:80','regex:/^[A-Za-z0-9-]+$/'],'mode_reglement'=>['required','string','in:especes,mobile_money,carte'],'montant_recu'=>['required_if:mode_reglement,especes','integer','min:0','max:1000000000'],'client_nom'=>['nullable','string','max:180'],'lignes'=>['required','array','min:1','max:50'],'lignes.*.product_id'=>['required','integer','min:1','distinct'],'lignes.*.quantite'=>['required','integer','min:1','max:100000']]);
        $result=$this->service->sell((int)$r->user()->id,$d);
        return response()->json($result,($result['replayed']??false)?200:201);
    }
}

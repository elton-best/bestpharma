<?php
namespace App\Services;
use App\Models\StockLot;
use App\Mail\AlertePeremption;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
class SurveillancePeremptionService
{
    public const SEUILS = [90,45,10,1,0];
    public function executer(): array
    {
        $jour = now('Africa/Porto-Novo')->startOfDay();
        $bilan = ['bloques' => 0, 'prepares' => 0, 'envoyes' => 0, 'erreurs' => 0, 'courriel_configure' => !in_array(config('mail.default'), ['log','array'], true)];
        // Le filtrage de vente reste immédiat même si le planificateur est arrêté.
        StockLot::whereDate('date_peremption', '<=', $jour->toDateString())->where('quantite_disponible', '>', 0)
            ->where(fn ($q) => $q->where('statut_detail', 'commercialisable')->orWhere(fn ($q) => $q->whereNull('statut_detail')->where('statut', 'en_stock')))
            ->chunkById(100, function ($lots) use (&$bilan) {
                foreach ($lots as $lot) {
                    $lot->update(['statut' => 'quarantaine', 'statut_detail' => 'quarantaine', 'motif_quarantaine' => 'Date de péremption atteinte', 'date_changement_statut' => now()]);
                    $bilan['bloques']++;
                }
            });
        foreach (self::SEUILS as $seuil) {
            $date = $jour->copy()->addDays($seuil)->toDateString();
            StockLot::whereDate('date_peremption', $date)->where('quantite_disponible', '>', 0)->chunkById(100, function ($lots) use ($seuil, &$bilan) {
                foreach ($lots as $lot) {
                    $destinataires = DB::table('users')->join('utilisateurs_officines as uo', 'uo.user_id', '=', 'users.id')
                        ->where('uo.officine_id', $lot->officine_id)->where('uo.actif', true)->where('uo.archived', false)
                        ->where('users.actif', true)->where('users.archived', false)
                        ->whereIn('uo.role_code', ['promoteur','pharmacien_titulaire','pharmacien_adjoint','rmq'])->select('users.id','users.email')->distinct()->get();
                    foreach ($destinataires as $u) {
                        if (!filter_var($u->email, FILTER_VALIDATE_EMAIL)) continue;
                        $bilan['prepares'] += DB::table('alertes_peremption')->insertOrIgnore([
                            'id' => (string) Str::uuid(), 'officine_id' => $lot->officine_id, 'stock_lot_id' => $lot->id, 'user_id' => $u->id,
                            'date_peremption' => $lot->date_peremption->toDateString(), 'seuil_jours' => $seuil, 'destinataire' => $u->email,
                            'statut' => 'en_attente', 'tentatives' => 0, 'created_at' => now(), 'updated_at' => now(),
                        ]);
                    }
                }
            });
        }
        if (!$bilan['courriel_configure']) return $bilan;
        DB::table('alertes_peremption')->whereIn('statut', ['en_attente','erreur'])->where('tentatives', '<', 5)->orderBy('id')->chunkById(100, function ($alertes) use (&$bilan) {
            foreach ($alertes as $alerte) {
                DB::transaction(function () use ($alerte, &$bilan) {
                    $a = DB::table('alertes_peremption')->where('id', $alerte->id)->lockForUpdate()->first();
                    if (!$a || !in_array($a->statut, ['en_attente','erreur']) || $a->tentatives >= 5) return;
                    $lot = StockLot::with(['produit','officine'])->find($a->stock_lot_id);
                    $habilite = DB::table('utilisateurs_officines')->where('officine_id', $a->officine_id)->where('user_id', $a->user_id)->where('actif', true)->where('archived', false)->whereIn('role_code', ['promoteur','pharmacien_titulaire','pharmacien_adjoint','rmq'])->exists();
                    $u = DB::table('users')->where('id', $a->user_id)->where('actif', true)->where('archived', false)->first();
                    if (!$lot || ($a->seuil_jours > 0 && $lot->jours_avant_peremption !== $a->seuil_jours) || !$habilite || !$u || $u->email !== $a->destinataire || $lot->quantite_disponible <= 0 || $lot->date_peremption->toDateString() !== $a->date_peremption) {
                        DB::table('alertes_peremption')->where('id', $a->id)->update(['statut' => 'annulee', 'updated_at' => now()]); return;
                    }
                    try {
                        Mail::to($a->destinataire)->send(new AlertePeremption($lot->produit->nom_commercial, $lot->numero_lot, $lot->date_peremption->format('d/m/Y'), $a->seuil_jours, $lot->officine->nom));
                        DB::table('alertes_peremption')->where('id', $a->id)->update(['statut' => 'envoyee', 'envoye_le' => now(), 'tentatives' => $a->tentatives + 1, 'updated_at' => now()]); $bilan['envoyes']++;
                    } catch (\Throwable $e) {
                        report($e); DB::table('alertes_peremption')->where('id', $a->id)->update(['statut' => 'erreur', 'tentatives' => $a->tentatives + 1, 'updated_at' => now()]); $bilan['erreurs']++;
                    }
                });
            }
        });
        return $bilan;
    }
}

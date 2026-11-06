<?php

namespace Tests\Feature;

use App\Models\Officine;
use App\Models\User;
use App\Models\UtilisateurOfficine;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class PeremptionEtCourrielsTest extends TestCase
{
    use DatabaseTransactions;

    private Officine $officine;
    private User $titulaire;
    private User $dispensateur;

    protected function setUp(): void
    {
        parent::setUp();
        $uid = Str::random(8);
        $this->officine = Officine::create(['nom' => 'Officine de recette', 'raison_sociale' => 'Recette',
            'numero_licence' => 'TEST-'.$uid, 'adresse' => 'Recette', 'telephone' => '00000000']);
        foreach (['titulaire' => 'pharmacien_titulaire', 'dispensateur' => 'dispensateur'] as $propriete => $role) {
            $this->$propriete = User::create(['name' => 'Utilisateur de recette', 'email' => "$propriete-$uid@example.test", 'password' => bcrypt('Recette2026!'), 'actif' => true]);
            UtilisateurOfficine::create(['officine_id' => $this->officine->id, 'user_id' => $this->$propriete->id, 'role_code' => $role, 'actif' => true]);
        }
    }

    private function lot(int $jours): \App\Models\StockLot
    {
        $p = \App\Models\Produit::create(['officine_id' => $this->officine->id, 'code_cip' => Str::random(20), 'nom_commercial' => 'Produit de recette', 'prix_public_ttc' => 500]);
        return \App\Models\StockLot::create(['officine_id' => $this->officine->id, 'produit_id' => $p->id, 'numero_lot' => 'RECETTE-'.$jours,
            'date_peremption' => now('Africa/Porto-Novo')->addDays($jours)->toDateString(), 'quantite_initiale' => 10, 'quantite_disponible' => 10,
            'statut' => 'en_stock', 'statut_detail' => 'commercialisable']);
    }
    public function test_blocage_le_jour_meme_sans_attendre_la_tache_planifiee(): void
    {
        $lot = $this->lot(0); $demain = $this->lot(1);
        $this->assertFalse($lot->est_vendable); $this->assertTrue($demain->est_vendable);
        $this->assertSame('perime', $lot->statut_peremption);
        $this->assertFalse(\App\Models\StockLot::vendables()->where('id', $lot->id)->exists());
        $r = $this->actingAs($this->titulaire)->getJson('/api/produits?vendables=1')->assertOk();
        $this->assertNotContains($lot->produit_id, array_column($r->json('data'), 'id'));
        $this->assertContains($demain->produit_id, array_column($r->json('data'), 'id'));
        $this->actingAs($this->titulaire)->postJson('/api/dispensations', ['type_dispensation' => 'conseil_sans_ordonnance', 'patient_nom' => 'Patient de recette',
            'lignes' => [['produit_id' => $lot->produit_id, 'quantite' => 1]]])->assertUnprocessable();
        $this->actingAs($this->titulaire)->postJson('/api/caisse/ouvrir', ['fond_caisse_ouverture' => 0])->assertCreated();
        $this->actingAs($this->titulaire)->postJson('/api/caisse/ventes', ['mode_reglement' => 'especes', 'montant_recu' => 500,
            'lignes' => [['produit_id' => $lot->produit_id, 'quantite' => 1]]])->assertUnprocessable()->assertJsonPath('message', 'Stock insuffisant pour Produit de recette. Demandé: 1, Dispo: 0');
        $this->assertSame(10, $lot->fresh()->quantite_disponible);
    }
    public function test_le_changement_de_jour_est_celui_du_benin(): void
    {
        try {
            \Carbon\Carbon::setTestNow(\Carbon\Carbon::parse('2026-11-06T22:59:58Z'));
            $lot = $this->lot(1);
            $this->assertTrue($lot->est_vendable);
            \Carbon\Carbon::setTestNow(\Carbon\Carbon::parse('2026-11-06T23:00:00Z'));
            $this->assertFalse($lot->fresh()->est_vendable);
            $this->assertFalse(\App\Models\StockLot::vendables()->where('id', $lot->id)->exists());
        } finally { \Carbon\Carbon::setTestNow(); }
    }
    public function test_tous_les_paliers_sont_prepares_sans_envoi_fictif_et_sans_doublons(): void
    {
        config(['mail.default' => 'log']);
        foreach ([90,45,10,1,0] as $jours) $this->lot($jours);
        $service = app(\App\Services\SurveillancePeremptionService::class);
        $premier = $service->executer(); $second = $service->executer();
        $this->assertFalse($premier['courriel_configure']); $this->assertSame(1, $premier['bloques']);
        $this->assertSame(5, $premier['prepares']); $this->assertSame(0, $premier['envoyes']);
        $this->assertSame(0, $second['prepares']);
        $this->assertSame(5, DB::table('alertes_peremption')->where('officine_id', $this->officine->id)->count());
        $this->assertSame(0, DB::table('alertes_peremption')->where('officine_id', $this->officine->id)->whereNotNull('envoye_le')->count());
    }
    public function test_un_secours_vers_le_journal_ne_compte_pas_comme_un_envoi_reel(): void
    {
        config(['mail.default' => 'failover']);
        $this->assertFalse(\App\Services\SurveillancePeremptionService::courrielConfigure());
        config(['mail.default' => 'journal_personnalise', 'mail.mailers.journal_personnalise.transport' => 'log']);
        $this->assertFalse(\App\Services\SurveillancePeremptionService::courrielConfigure());
    }
    public function test_envoi_au_responsable_actif_uniquement(): void
    {
        \Illuminate\Support\Facades\Mail::fake(); config(['mail.default' => 'smtp']);
        $lot = $this->lot(45);
        $b = app(\App\Services\SurveillancePeremptionService::class)->executer();
        $this->assertSame(1, $b['envoyes']);
        \Illuminate\Support\Facades\Mail::assertSent(\App\Mail\AlertePeremption::class, fn ($m) => $m->hasTo($this->titulaire->email) && $m->jours === 45);
        \Illuminate\Support\Facades\Mail::assertNotSent(\App\Mail\AlertePeremption::class, fn ($m) => $m->hasTo($this->dispensateur->email));
        app(\App\Services\SurveillancePeremptionService::class)->executer();
        \Illuminate\Support\Facades\Mail::assertSentCount(1);
    }
}

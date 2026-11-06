<?php

namespace Tests\Feature;

use App\Models\Officine;
use App\Models\User;
use App\Models\UtilisateurOfficine;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class SuivisDocumentairesTest extends TestCase
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

    private function url(string $type): string
    {
        return "/api/officines/{$this->officine->id}/suivis-documentaires/{$type}";
    }

    private function formation(): array
    {
        return ['statut' => 'planifie', 'donnees' => ['theme' => 'Recette : chaîne du froid', 'public_vise' => 'Équipe de recette',
            'date_debut_prevue' => now()->toDateString(), 'date_fin_prevue' => now()->toDateString(), 'responsable_suivi' => 'Responsable de recette']];
    }

    public function test_formations_reelles_corrections_et_conflit_de_version(): void
    {
        $url = $this->url('formations');
        $this->actingAs($this->titulaire)->getJson($url)->assertOk()->assertJsonPath('total', 0);
        $creation = $this->actingAs($this->titulaire)->postJson($url, $this->formation())->assertCreated();
        $this->actingAs($this->titulaire)->getJson($url.'?q=chaîne')->assertOk()->assertJsonPath('total', 1);
        $modif = $this->formation();
        $modif['statut'] = 'realise'; $modif['revision'] = 1; $modif['motif_modification'] = 'Session effectivement tenue.';
        $this->actingAs($this->titulaire)->putJson($url.'/'.$creation->json('id'), $modif)->assertUnprocessable()
            ->assertJsonValidationErrors(['donnees.formateur', 'donnees.bilan', 'donnees.date_realisation']);
        $modif['donnees'] += ['formateur' => 'Formateur de recette', 'bilan' => 'Démonstration réalisée, acquis à vérifier individuellement.', 'date_realisation' => now()->toDateString()];
        $this->actingAs($this->titulaire)->putJson($url.'/'.$creation->json('id'), $modif)->assertOk()->assertJsonPath('revision', 2);
        $this->actingAs($this->titulaire)->putJson($url.'/'.$creation->json('id'), $modif)->assertConflict();
        $modif['revision'] = 2; $modif['statut'] = 'planifie';
        $this->actingAs($this->titulaire)->putJson($url.'/'.$creation->json('id'), $modif)->assertConflict();
        $this->assertDatabaseHas('audit_logs', ['table_name' => 'suivis_documentaires', 'record_id' => $creation->json('id'), 'action' => 'UPDATE', 'officine_id' => $this->officine->id]);
    }

    public function test_droits_et_absence_de_lecture_croisee(): void
    {
        $this->actingAs($this->dispensateur)->getJson($this->url('formations').'/definition')->assertOk()->assertJsonPath('peut_ecrire', false);
        $this->actingAs($this->dispensateur)->postJson($this->url('formations'), $this->formation())->assertForbidden();
        $autre = Str::uuid();
        $this->actingAs($this->titulaire)->getJson("/api/officines/{$autre}/suivis-documentaires/formations")->assertForbidden();
        $this->actingAs($this->titulaire)->postJson($this->url('formations'), ['statut' => 'realise', 'donnees' => []])->assertUnprocessable();
    }

    public function test_dates_annulation_et_champs_inconnus_controles(): void
    {
        $d = $this->formation(); $d['donnees']['date_fin_prevue'] = now()->subDay()->toDateString();
        $this->actingAs($this->titulaire)->postJson($this->url('formations'), $d)->assertUnprocessable();
        $d = $this->formation(); $d['statut'] = 'annule';
        $this->actingAs($this->titulaire)->postJson($this->url('formations'), $d)->assertUnprocessable();
        $d['donnees']['motif_annulation'] = 'Formateur indisponible.';
        $this->actingAs($this->titulaire)->postJson($this->url('formations'), $d)->assertCreated();
        $d = $this->formation(); $d['donnees']['empreinte_fabriquee'] = 'interdit';
        $this->actingAs($this->titulaire)->postJson($this->url('formations'), $d)->assertUnprocessable();
    }

    public function test_maintenance_liee_au_materiel_de_lofficine(): void
    {
        $equipement = (string) Str::uuid();
        DB::table('equipements_officine')->insert(['id' => $equipement, 'officine_id' => $this->officine->id, 'code_interne' => 'RECETTE-01', 'designation' => 'Appareil de recette', 'categorie' => 'autre']);
        $d = ['statut' => 'planifie', 'donnees' => ['equipement_id' => (string) Str::uuid(), 'nature' => 'Contrôle préventif',
            'description' => 'Intervention de recette', 'date_prevue' => now()->toDateString(), 'responsable_suivi' => 'Responsable technique']];
        $this->actingAs($this->titulaire)->postJson($this->url('maintenance'), $d)->assertUnprocessable();
        $d['donnees']['equipement_id'] = $equipement;
        $r = $this->actingAs($this->titulaire)->postJson($this->url('maintenance'), $d)->assertCreated()->assertJsonPath('donnees.equipement_nom', 'Appareil de recette');
        $d['statut'] = 'realise'; $d['revision'] = 1; $d['motif_modification'] = 'Intervention terminée.';
        $d['donnees'] += ['prestataire' => 'Prestataire de recette', 'resultat' => 'Fonctionnement constaté normal', 'date_realisation' => now()->addDay()->toDateString()];
        $this->actingAs($this->titulaire)->putJson($this->url('maintenance').'/'.$r->json('id'), $d)->assertUnprocessable();
        $d['donnees']['date_realisation'] = now()->toDateString();
        $this->actingAs($this->titulaire)->putJson($this->url('maintenance').'/'.$r->json('id'), $d)->assertOk()->assertJsonPath('statut', 'realise');
    }
}

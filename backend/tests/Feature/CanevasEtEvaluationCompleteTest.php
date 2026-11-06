<?php

namespace Tests\Feature;

use App\Models\Officine;
use App\Models\User;
use App\Models\UtilisateurOfficine;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class CanevasEtEvaluationCompleteTest extends TestCase
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

    public function test_canevas_rempli_persiste_en_brouillon_et_refuse_les_zones_fabriquees(): void
    {
        $base = "/api/officines/{$this->officine->id}/canevas";
        $liste = $this->actingAs($this->titulaire)->getJson($base)->assertOk();
        $id = $liste->json('0.id');
        $source = $this->actingAs($this->titulaire)->getJson("$base/$id")->assertOk()->json();
        $cle = app(\App\Services\CatalogueCanevasService::class)->champs($source)[0];
        $donnees = ['valeurs' => [$cle => 'Texte de recette'], 'type_doc' => 'procedure', 'processus' => 'QAM'];
        $this->actingAs($this->dispensateur)->postJson("$base/$id/documents", $donnees)->assertForbidden();
        $r = $this->actingAs($this->titulaire)->postJson("$base/$id/documents", $donnees)->assertCreated()->assertJsonPath('statut', 'brouillon');
        $contenu = json_decode($r->json('contenu'), true);
        $this->assertSame($source, $contenu['canevas']);
        $this->assertSame('Texte de recette', $contenu['valeurs'][$cle]);
        $this->actingAs($this->titulaire)->putJson("/api/officines/{$this->officine->id}/documents/{$r->json('id')}", [
            'contenu' => $r->json('contenu'), 'empreinte_edition' => str_repeat('0',64),
        ])->assertConflict();
        $donnees['valeurs']['invente'] = 'Interdit';
        $this->actingAs($this->titulaire)->postJson("$base/$id/documents", $donnees)->assertUnprocessable();
        $this->actingAs($this->titulaire)->getJson('/api/officines/'.Str::uuid().'/canevas')->assertForbidden();
    }

    public function test_grille_complete_et_actions_sans_fausses_notes(): void
    {
        $base = "/api/officines/{$this->officine->id}/auto-evaluation";
        $r = $this->actingAs($this->titulaire)->getJson("$base/campagne-courante")->assertOk()
            ->assertJsonCount(267, 'evaluations')->assertJsonCount(10, 'synthese_chapitres')
            ->assertJsonPath('statistiques.total_non_evalues', 267)->assertJsonPath('referentiel_complet', true);
        $campagne = $r->json('campagne.id');
        $evaluation = $r->json('evaluations.0.id');
        $this->actingAs($this->dispensateur)->putJson("$base/evaluer/$evaluation", ['cotation' => 'conforme'])->assertForbidden();
        $this->actingAs($this->titulaire)->putJson("$base/evaluer/$evaluation", ['cotation' => 'ecart_majeur', 'preuve' => 'Constat de recette'])->assertOk();
        $this->actingAs($this->titulaire)->postJson("$base/generer-capa/$evaluation", ['action_corrective' => 'Action de recette'])->assertCreated();
        $this->actingAs($this->titulaire)->postJson("$base/nouvelle-complete")->assertCreated()->assertJsonPath('id', $campagne);
        $this->actingAs($this->titulaire)->getJson("$base/campagne-courante")->assertOk()->assertJsonPath('statistiques.total_ecarts_majeurs', 1);
    }
}

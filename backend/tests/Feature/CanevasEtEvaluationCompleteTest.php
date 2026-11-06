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
        $url = "/api/officines/{$this->officine->id}/documents/{$r->json('id')}";
        $this->actingAs($this->dispensateur)->putJson($url, ['contenu' => $r->json('contenu'), 'empreinte_edition' => $r->json('empreinte_contenu')])->assertForbidden();
        $contenu['valeurs'][$cle] = 'Correction de recette';
        $corrige = $this->actingAs($this->titulaire)->putJson($url, ['contenu' => json_encode($contenu), 'empreinte_edition' => $r->json('empreinte_contenu')])->assertOk();
        $this->assertSame('Correction de recette', json_decode($corrige->json('contenu'), true)['valeurs'][$cle]);
        $contenu['canevas']['sha256'] = str_repeat('0', 64);
        $this->actingAs($this->titulaire)->putJson($url, ['contenu' => json_encode($contenu), 'empreinte_edition' => $corrige->json('empreinte_contenu')])->assertUnprocessable();

        $this->actingAs($this->titulaire)->putJson("/api/officines/{$this->officine->id}/documents/{$r->json('id')}", [
            'contenu' => $r->json('contenu'), 'empreinte_edition' => str_repeat('0',64),
        ])->assertConflict();
        $donnees['valeurs']['invente'] = 'Interdit';
        $this->actingAs($this->titulaire)->postJson("$base/$id/documents", $donnees)->assertUnprocessable();
        $this->actingAs($this->titulaire)->getJson('/api/officines/'.Str::uuid().'/canevas')->assertForbidden();
    }

    public function test_odt_adaptable_et_pdf_annote_en_consultation_seulement(): void
    {
        $sources = app(\App\Services\CatalogueCanevasService::class)->tous();
        $base = "/api/officines/{$this->officine->id}/canevas";
        $pdf = array_values(array_filter($sources, fn ($c) => ($c['format'] ?? null) === 'pdf'))[0];
        $this->actingAs($this->titulaire)->getJson("$base/{$pdf['id']}")->assertOk()->assertJsonCount(9, 'annotations')->assertJsonPath('usage', 'reference');
        $this->actingAs($this->titulaire)->postJson("$base/{$pdf['id']}/documents", ['valeurs' => [], 'type_doc' => 'procedure', 'processus' => 'QAM'])->assertUnprocessable();
        $odt = array_values(array_filter($sources, fn ($c) => ($c['format'] ?? null) === 'odt'))[0];
        $cle = app(\App\Services\CatalogueCanevasService::class)->champs($odt)[0];
        $r = $this->actingAs($this->titulaire)->postJson("$base/{$odt['id']}/documents", ['valeurs' => [$cle => 'Liste adaptée pour notre officine'], 'type_doc' => 'procedure', 'processus' => 'QAM'])->assertCreated();
        $contenu = json_decode($r->json('contenu'), true);
        $this->assertSame($odt['sha256'], $contenu['canevas']['sha256']);
        $this->assertSame('Liste adaptée pour notre officine', $contenu['valeurs'][$cle]);
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
    public function test_ancienne_campagne_conserve_ses_notes_lors_de_louverture_complete(): void
    {
        $ancienne = \App\Models\CampagneAutoEvaluation::create(['officine_id' => $this->officine->id, 'titre' => 'Ancienne grille de recette',
            'annee' => 2026, 'date_debut' => '2026-11-01', 'statut' => 'en_cours', 'score_global' => 100]);
        $article = \App\Models\EvaluationArticle::create(\App\Services\ReferentielBpdService::genererArticlesPourCampagne()[0] + [
            'campagne_id' => $ancienne->id, 'officine_id' => $this->officine->id, 'cotation' => 'conforme', 'preuve' => 'Ancienne preuve de recette',
        ]);
        $base = "/api/officines/{$this->officine->id}/auto-evaluation";
        $this->actingAs($this->titulaire)->getJson("$base/campagne-courante")->assertOk()->assertJsonCount(1, 'evaluations')->assertJsonPath('referentiel_complet', false);
        $nouvelle = $this->actingAs($this->titulaire)->postJson("$base/nouvelle-complete")->assertCreated();
        $this->assertNotSame($ancienne->id, $nouvelle->json('id'));
        $this->assertSame('conforme', $article->fresh()->cotation);
        $this->assertSame('Ancienne preuve de recette', $article->fresh()->preuve);
        $this->assertSame('remplacee', $ancienne->fresh()->statut);
        $this->actingAs($this->titulaire)->getJson("$base/campagne-courante")->assertOk()->assertJsonCount(267, 'evaluations')->assertJsonPath('statistiques.total_non_evalues', 267);
    }

}

<?php

namespace Tests\Feature;

use App\Models\Officine;
use App\Models\User;
use App\Models\UtilisateurOfficine;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class Partie1BpdWorkflowTest extends TestCase
{
    use DatabaseTransactions;

    protected Officine $officine;
    protected User $titulaire;
    protected User $dispensateur;

    protected function setUp(): void
    {
        parent::setUp();

        $this->officine = Officine::create([
            'id' => (string) Str::uuid(),
            'nom' => "Pharmacie Test BPD",
            'raison_sociale' => "Pharmacie Test SARL",
            'numero_licence' => "LIC-TEST-001",
            'adresse' => "Cotonou",
            'telephone' => "+229 00 00 00 01",
        ]);

        $this->titulaire = User::create([
            'id' => (string) Str::uuid(),
            'name' => "Dr Titulaire",
            'email' => "titulaire@test.bj",
            'password' => bcrypt("Secret123456!"),
            'mfa_enabled' => false,
            'actif' => true,
        ]);

        UtilisateurOfficine::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officine->id,
            'user_id' => $this->titulaire->id,
            'role_code' => 'pharmacien_titulaire',
            'actif' => true,
        ]);

        $this->dispensateur = User::create([
            'id' => (string) Str::uuid(),
            'name' => "Auxiliaire Comptoir",
            'email' => "dispensateur@test.bj",
            'password' => bcrypt("Secret123456!"),
            'mfa_enabled' => false,
            'actif' => true,
        ]);

        UtilisateurOfficine::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officine->id,
            'user_id' => $this->dispensateur->id,
            'role_code' => 'dispensateur',
            'actif' => true,
        ]);
    }

    public function test_dispensateur_cannot_approve_document_but_titulaire_can(): void
    {
        // 1. Création d'un document en brouillon
        $createRes = $this->actingAs($this->dispensateur)
            ->postJson("/api/officines/{$this->officine->id}/documents", [
                'titre' => 'Procédure test',
                'type_doc' => 'PR',
                'processus' => 'QAM',
                'contenu' => 'Contenu test',
            ]);

        $createRes->assertStatus(201);
        $docId = $createRes->json('id');

        // 2. Le dispensateur tente d'approuver le document -> Doit être refusé (403)
        $approveRes = $this->actingAs($this->dispensateur)
            ->putJson("/api/officines/{$this->officine->id}/documents/{$docId}", [
                'statut' => 'valide',
            ]);

        $approveRes->assertStatus(403);

        // Sans confirmation du mot de passe : refus, aucune approbation créée.
        $url = "/api/officines/{$this->officine->id}/documents/{$docId}";
        $preuve = [
            'statut' => 'valide', 'password' => 'Secret123456!',
            'empreinte_attendue' => $createRes->json('empreinte_contenu'),
            'intention' => 'approbation_documentaire',
        ];
        $this->actingAs($this->titulaire)->putJson($url, ['statut' => 'valide'])->assertUnprocessable();
        $this->actingAs($this->titulaire)->putJson($url, array_merge($preuve, ['password' => 'incorrect']))->assertUnprocessable();
        $this->actingAs($this->titulaire)->putJson($url, array_merge($preuve, ['empreinte_attendue' => str_repeat('0', 64)]))->assertConflict();
        $this->assertDatabaseMissing('approbations_documents', ['document_id' => $docId]);
        $titulaireApproveRes = $this->actingAs($this->titulaire)->putJson($url, $preuve);

        $titulaireApproveRes->assertStatus(200);
        $this->assertEquals('valide', $titulaireApproveRes->json('statut'));
        $this->assertEquals($this->titulaire->name, $titulaireApproveRes->json('approbateur_nom'));
        $this->assertDatabaseHas('approbations_documents', ['document_id' => $docId, 'signataire_id' => $this->titulaire->id]);
        $this->actingAs($this->titulaire)->putJson($url, ['contenu' => 'Modification interdite'])->assertConflict();
        $historique = $this->actingAs($this->titulaire)->getJson($url.'/approbations')->assertOk();
        $this->assertTrue($historique->json('0.empreinte_verifiee'));
        $this->assertStringContainsString('Contenu test', $historique->json('0.contenu_signe'));
        $this->actingAs($this->titulaire)->putJson($url, ['statut' => 'brouillon'])->assertOk()->assertJsonPath('version', 2);
        $this->actingAs($this->titulaire)->putJson($url, ['contenu' => 'Texte révisé'])->assertOk();
        $historiqueApres = $this->actingAs($this->titulaire)->getJson($url.'/approbations')->assertOk();
        $this->assertSame($historique->json('0.contenu_signe'), $historiqueApres->json('0.contenu_signe'));

    }

    public function test_pointage_pharmacien_presence_status(): void
    {
        // Créer un employé pharmacien et un auxiliaire
        $empPharmaId = (string) Str::uuid();
        DB::table('employes')->insert([
            'id' => $empPharmaId,
            'officine_id' => $this->officine->id,
            'nom_complet' => 'Dr Pharmacien Test',
            'poste' => 'pharmacien_titulaire',
            'actif' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Avant pointage : absence de pharmacien
        $statusBefore = $this->actingAs($this->titulaire)
            ->getJson("/api/officines/{$this->officine->id}/pointages");

        $statusBefore->assertStatus(200);
        $this->assertFalse($statusBefore->json('pharmacien_present'));

        // Pointage d'arrivée du pharmacien
        $pointageRes = $this->actingAs($this->titulaire)
            ->postJson("/api/officines/{$this->officine->id}/pointages", [
                'employe_id' => $empPharmaId,
                'type' => 'arrivee',
            ]);

        $pointageRes->assertStatus(201);
        $this->assertTrue($pointageRes->json('pharmacien_present'));

        // Vérification de la conformité réglementaire (art. 1.11)
        $statusAfter = $this->actingAs($this->titulaire)
            ->getJson("/api/officines/{$this->officine->id}/pointages");

        $statusAfter->assertStatus(200);
        $this->assertTrue($statusAfter->json('pharmacien_present'));
        $this->assertEquals('CONFORME_BPD', $statusAfter->json('statut_reglementaire'));
    }
    public function test_journal_reserve_aux_responsables_de_lofficine(): void
    {
        $url = "/api/officines/{$this->officine->id}/audit-logs/verifier-integrite";
        $this->actingAs($this->dispensateur)->getJson($url)->assertForbidden();
        $this->actingAs($this->titulaire)->getJson($url)->assertOk()
            ->assertJsonStructure(['status', 'integre', 'total_entrees_verifiees', 'message']);
        $autre = (string) Str::uuid();
        $this->actingAs($this->titulaire)
            ->getJson("/api/officines/{$autre}/audit-logs/verifier-integrite")->assertForbidden();
    }
    public function test_approbation_limitee_en_nombre_de_tentatives(): void
    {
        \Illuminate\Support\Facades\RateLimiter::clear('approbation-document:'.$this->titulaire->id);
        $creation = $this->actingAs($this->titulaire)->postJson("/api/officines/{$this->officine->id}/documents", [
            'titre' => 'Recette de limitation des tentatives',
        ])->assertCreated();
        $url = "/api/officines/{$this->officine->id}/documents/".$creation->json('id');
        $preuve = ['statut' => 'valide', 'password' => 'incorrect', 'intention' => 'approbation_documentaire',
            'empreinte_attendue' => $creation->json('empreinte_contenu')];
        for ($i = 0; $i < 5; $i++) {
            $this->actingAs($this->titulaire)->putJson($url, $preuve)->assertUnprocessable();
        }
        $this->actingAs($this->titulaire)->putJson($url, $preuve)->assertStatus(429);
        $this->assertDatabaseMissing('approbations_documents', ['document_id' => $creation->json('id')]);
        \Illuminate\Support\Facades\RateLimiter::clear('approbation-document:'.$this->titulaire->id);
    }
    public function test_fichier_prive_versionne_lie_a_lapprobation(): void
    {
        \Illuminate\Support\Facades\Storage::fake('ged');
        $creation = $this->actingAs($this->titulaire)->postJson("/api/officines/{$this->officine->id}/documents", [
            'titre' => 'Procédure de recette avec pièce privée',
        ])->assertCreated();
        $url = "/api/officines/{$this->officine->id}/documents/".$creation->json('id');
        $pdf = fn () => \Illuminate\Http\UploadedFile::fake()->createWithContent('preuve.pdf', "%PDF-1.4\nDocument de recette\n%%EOF");
        $depot = $this->actingAs($this->titulaire)->post($url.'/fichiers', [
            'file' => $pdf(), 'version_document' => 1, 'indice_revision' => 0,
        ], ['Accept' => 'application/json'])->assertCreated();
        $this->assertArrayNotHasKey('chemin', $depot->json());
        $this->actingAs($this->titulaire)->post($url.'/fichiers', [
            'file' => $pdf(), 'version_document' => 1, 'indice_revision' => 0,
        ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('id', $depot->json('id'));
        $fiche = $this->actingAs($this->titulaire)->getJson($url)->assertOk();
        $this->assertNotSame($creation->json('empreinte_contenu'), $fiche->json('empreinte_contenu'));
        $preuve = ['statut' => 'valide', 'password' => 'Secret123456!', 'intention' => 'approbation_documentaire',
            'empreinte_attendue' => $creation->json('empreinte_contenu')];
        $this->actingAs($this->titulaire)->putJson($url, $preuve)->assertConflict();
        $preuve['empreinte_attendue'] = $fiche->json('empreinte_contenu');
        $this->actingAs($this->titulaire)->putJson($url, $preuve)->assertOk();
        $this->actingAs($this->titulaire)->post($url.'/fichiers', [
            'file' => $pdf(), 'version_document' => 1, 'indice_revision' => 0,
        ], ['Accept' => 'application/json'])->assertConflict();
        $telechargement = $url.'/fichiers/'.$depot->json('id').'/telecharger';
        $this->actingAs($this->titulaire)->get($telechargement)->assertDownload('preuve.pdf')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
        $chemin = DB::table('fichiers_documents')->where('id', $depot->json('id'))->value('chemin');
        \Illuminate\Support\Facades\Storage::disk('ged')->put($chemin, 'Fichier volontairement altéré');
        $this->actingAs($this->titulaire)->getJson($telechargement)->assertConflict();
        $autre = (string) Str::uuid();
        $this->actingAs($this->titulaire)->getJson("/api/officines/{$autre}/documents/".$creation->json('id').'/fichiers')->assertForbidden();
    }
}

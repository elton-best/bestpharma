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

        // 3. Le pharmacien titulaire valide le document -> Doit réussir (200)
        $titulaireApproveRes = $this->actingAs($this->titulaire)
            ->putJson("/api/officines/{$this->officine->id}/documents/{$docId}", [
                'statut' => 'valide',
            ]);

        $titulaireApproveRes->assertStatus(200);
        $this->assertEquals('valide', $titulaireApproveRes->json('statut'));
        $this->assertEquals($this->titulaire->name, $titulaireApproveRes->json('approbateur_nom'));
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
}

<?php

namespace Tests\Feature;

use App\Models\Dispensation;
use App\Models\Officine;
use App\Models\Ordonnance;
use App\Models\Patient;
use App\Models\Prescripteur;
use App\Models\Produit;
use App\Models\StockLot;
use App\Models\User;
use App\Models\UtilisateurOfficine;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class DossierPatientOrdonnanceTest extends TestCase
{
    use DatabaseTransactions;

    protected Officine $officineA;
    protected Officine $officineB;
    protected User $pharmacienA;
    protected User $pharmacienB;
    protected Produit $amoxicilline;
    protected Produit $ibuprofene;

    protected function setUp(): void
    {
        parent::setUp();

        $uid = Str::random(6);

        // Officine A
        $this->officineA = Officine::create([
            'id' => (string) Str::uuid(),
            'nom' => "Pharmacie Test A {$uid}",
            'raison_sociale' => "Pharmacie Test A {$uid} SARL",
            'numero_licence' => "LIC-A-{$uid}",
            'email' => "officine_a_{$uid}@bestpharma.bj",
            'telephone' => '+229 97 00 00 01',
            'adresse' => 'Cotonou',
        ]);

        $this->pharmacienA = User::create([
            'id' => (string) Str::uuid(),
            'name' => 'Dr Pharmacien A',
            'email' => "pharma_a_{$uid}@bestpharma.bj",
            'password' => bcrypt('Password123!'),
            'telephone' => '+229 97 00 00 11',
            'actif' => true,
        ]);

        UtilisateurOfficine::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officineA->id,
            'user_id' => $this->pharmacienA->id,
            'role_code' => 'pharmacien_titulaire',
            'actif' => true,
        ]);

        // Officine B
        $this->officineB = Officine::create([
            'id' => (string) Str::uuid(),
            'nom' => "Pharmacie Test B {$uid}",
            'raison_sociale' => "Pharmacie Test B {$uid} SARL",
            'numero_licence' => "LIC-B-{$uid}",
            'email' => "officine_b_{$uid}@bestpharma.bj",
            'telephone' => '+229 97 00 00 02',
            'adresse' => 'Porto-Novo',
        ]);

        $this->pharmacienB = User::create([
            'id' => (string) Str::uuid(),
            'name' => 'Dr Pharmacien B',
            'email' => "pharma_b_{$uid}@bestpharma.bj",
            'password' => bcrypt('Password123!'),
            'telephone' => '+229 97 00 00 22',
            'actif' => true,
        ]);

        UtilisateurOfficine::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officineB->id,
            'user_id' => $this->pharmacienB->id,
            'role_code' => 'pharmacien_titulaire',
            'actif' => true,
        ]);

        // Produits de test
        $this->amoxicilline = Produit::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officineA->id,
            'code_cip' => "CIP-AMOX-{$uid}",
            'nom_commercial' => 'Amoxicilline Biogaran 500mg',
            'dci' => 'Amoxicilline',
            'forme' => 'Gélule',
            'dosage' => '500mg',
            'classe_therapeutique' => 'Pénicillines / Bétalactamines',
            'tableau_substance' => 'liste_1',
            'est_thermolabile' => false,
            'necessite_ordonnance' => true,
            'prix_achat_ht' => 1200,
            'prix_public_ttc' => 1800,
        ]);

        $this->ibuprofene = Produit::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officineA->id,
            'code_cip' => "CIP-IBUP-{$uid}",
            'nom_commercial' => 'Ibuprofène Mylan 400mg',
            'dci' => 'Ibuprofène',
            'forme' => 'Comprimé',
            'dosage' => '400mg',
            'classe_therapeutique' => 'Anti-inflammatoire non stéroïdien (AINS)',
            'tableau_substance' => 'liste_2',
            'est_thermolabile' => false,
            'necessite_ordonnance' => false,
            'prix_achat_ht' => 800,
            'prix_public_ttc' => 1400,
        ]);

        // Lots en stock pour A
        StockLot::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officineA->id,
            'produit_id' => $this->amoxicilline->id,
            'numero_lot' => "LOT-AMOX-{$uid}",
            'date_peremption' => Carbon::now()->addMonths(12)->format('Y-m-d'),
            'quantite_initiale' => 50,
            'quantite_disponible' => 50,
            'statut' => 'en_stock',
        ]);

        StockLot::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officineA->id,
            'produit_id' => $this->ibuprofene->id,
            'numero_lot' => "LOT-IBUP-{$uid}",
            'date_peremption' => Carbon::now()->addMonths(18)->format('Y-m-d'),
            'quantite_initiale' => 50,
            'quantite_disponible' => 50,
            'statut' => 'en_stock',
        ]);
    }

    public function test_patient_dossier_crud_and_isolation(): void
    {
        // 1. Création patient pour Officine A
        $response = $this->actingAs($this->pharmacienA)
            ->withHeader('X-Officine-Id', $this->officineA->id)
            ->postJson('/api/patients', [
                'nom' => 'Koffi',
                'prenom' => 'Jean',
                'sexe' => 'M',
                'date_naissance' => '1990-05-14',
                'telephone' => '+229 97 11 22 33',
                'allergies_declarees' => ['Pénicillines', 'Pollen'],
                'pathologies_chroniques' => ['Hypertension artérielle'],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.nom', 'KOFFI')
            ->assertJsonPath('data.prenom', 'Jean')
            ->assertJsonPath('data.age', Carbon::parse('1990-05-14')->age);

        $patientId = $response->json('data.id');

        // 2. Officine B ne peut pas voir le patient de A (isolation RLS)
        $responseIso = $this->actingAs($this->pharmacienB)
            ->withHeader('X-Officine-Id', $this->officineB->id)
            ->getJson("/api/patients/{$patientId}");

        $responseIso->assertStatus(404);

        // 3. Officine A peut consulter et mettre à jour
        $responseGet = $this->actingAs($this->pharmacienA)
            ->withHeader('X-Officine-Id', $this->officineA->id)
            ->getJson("/api/patients/{$patientId}");

        $responseGet->assertStatus(200)
            ->assertJsonPath('data.nom', 'KOFFI');

        $this->actingAs($this->pharmacienA)
            ->withHeader('X-Officine-Id', $this->officineA->id)
            ->putJson("/api/patients/{$patientId}", [
                'poids_kg' => 74.5,
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.poids_kg', '74.50');
    }

    public function test_ordonnance_lifecycle_and_renewal_rules(): void
    {
        // Création patient
        $patient = Patient::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officineA->id,
            'code_patient' => 'PAT-2026-TEST',
            'nom' => 'SOSSOU',
            'prenom' => 'Claire',
            'sexe' => 'F',
            'date_naissance' => '1995-02-10',
            'telephone' => '+229 96 00 00 00',
            'est_enceinte' => true,
        ]);

        // Création prescripteur
        $prescripteur = Prescripteur::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officineA->id,
            'nom_complet' => 'Dr Dossou Paul',
            'specialite' => 'Gynécologue',
            'numero_ordre' => 'MED-BEN-1234',
            'centre_sante' => 'Clinique Mahouna',
        ]);

        // Création ordonnance avec 1 renouvellement autorisé
        $resOrd = $this->actingAs($this->pharmacienA)
            ->withHeader('X-Officine-Id', $this->officineA->id)
            ->postJson('/api/ordonnances', [
                'patient_id' => $patient->id,
                'prescripteur_id' => $prescripteur->id,
                'date_prescription' => Carbon::now()->subDays(2)->format('Y-m-d'),
                'nombre_renouvellements_autorises' => 1,
            ]);

        $resOrd->assertStatus(201)
            ->assertJsonPath('data.statut', 'active')
            ->assertJsonPath('data.nombre_renouvellements_autorises', 1);

        $ordId = $resOrd->json('data.id');

        // Renouvellement 1/1
        $resRenov1 = $this->actingAs($this->pharmacienA)
            ->withHeader('X-Officine-Id', $this->officineA->id)
            ->postJson("/api/ordonnances/{$ordId}/renouveler");

        $resRenov1->assertStatus(200)
            ->assertJsonPath('data.nombre_renouvellements_effectues', 1)
            ->assertJsonPath('data.statut', 'cloturee'); // Le quota est atteint

        // Tentative de renouvellement supplémentaire -> refusé
        $resRenov2 = $this->actingAs($this->pharmacienA)
            ->withHeader('X-Officine-Id', $this->officineA->id)
            ->postJson("/api/ordonnances/{$ordId}/renouveler");

        $resRenov2->assertStatus(422)
            ->assertJsonPath('status', 'error');
    }

    public function test_scan_ordonnance_attachment_with_sha256(): void
    {
        Storage::fake('local');

        $patient = Patient::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officineA->id,
            'code_patient' => 'PAT-2026-SCAN',
            'nom' => 'HOUNWANOU',
            'prenom' => 'Aimé',
            'sexe' => 'M',
            'date_naissance' => '1985-06-20',
            'telephone' => '+229 95 12 34 56',
        ]);

        $ordonnance = Ordonnance::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officineA->id,
            'numero_ordonnance' => 'ORD-2026-SCAN1',
            'patient_id' => $patient->id,
            'date_prescription' => Carbon::now()->format('Y-m-d'),
            'statut' => 'active',
        ]);

        $file = UploadedFile::fake()->create('ordonnance_medicale.pdf', 300, 'application/pdf');

        $res = $this->actingAs($this->pharmacienA)
            ->withHeader('X-Officine-Id', $this->officineA->id)
            ->postJson("/api/ordonnances/{$ordonnance->id}/scan", [
                'fichier' => $file,
            ]);

        $res->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertNotNull($ordonnance->fresh()->scan_sha256);
        $this->assertEquals(64, strlen($ordonnance->fresh()->scan_sha256));
    }

    public function test_securite_clinique_allergy_and_pregnancy_detection(): void
    {
        // Patiente enceinte et allergique aux pénicillines
        $patient = Patient::create([
            'id' => (string) Str::uuid(),
            'officine_id' => $this->officineA->id,
            'code_patient' => 'PAT-2026-CLINIC',
            'nom' => 'ADEBAYO',
            'prenom' => 'Fatima',
            'sexe' => 'F',
            'date_naissance' => '1998-09-12',
            'telephone' => '+229 97 88 99 00',
            'est_enceinte' => true,
            'allergies_declarees' => ['Pénicillines'],
        ]);

        // 1. Vérification en direct des interactions
        $resCheck = $this->actingAs($this->pharmacienA)
            ->withHeader('X-Officine-Id', $this->officineA->id)
            ->postJson("/api/patients/{$patient->id}/verifier-interactions", [
                'produits' => [
                    ['produit_id' => $this->amoxicilline->id, 'quantite' => 1],
                    ['produit_id' => $this->ibuprofene->id, 'quantite' => 1],
                ],
            ]);

        $resCheck->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('a_bloquant', true)
            ->assertJsonPath('nb_alertes', 2);

        // 2. Tentative de dispensation directe -> bloquée par le moteur de sécurité clinique (allergie critique)
        $resDisp = $this->actingAs($this->pharmacienA)
            ->withHeader('X-Officine-Id', $this->officineA->id)
            ->postJson('/api/dispensations', [
                'type_dispensation' => 'ordonnance',
                'patient_id' => $patient->id,
                'lignes' => [
                    ['produit_id' => $this->amoxicilline->id, 'quantite' => 1],
                ],
            ]);

        $resDisp->assertStatus(422)
            ->assertJsonPath('bloquant', true);

        // 3. Forçage avec visa clinique éclairé du pharmacien
        $resDispForce = $this->actingAs($this->pharmacienA)
            ->withHeader('X-Officine-Id', $this->officineA->id)
            ->postJson('/api/dispensations', [
                'type_dispensation' => 'ordonnance',
                'patient_id' => $patient->id,
                'forcer_alertes' => true,
                'commentaires_posologie' => 'Avis allergologue favorable après désensibilisation.',
                'lignes' => [
                    ['produit_id' => $this->amoxicilline->id, 'quantite' => 1],
                ],
            ]);

        $resDispForce->assertStatus(201)
            ->assertJsonPath('status', 'success');

        // 4. L'historique thérapeutique du patient est automatiquement alimenté
        $resHist = $this->actingAs($this->pharmacienA)
            ->withHeader('X-Officine-Id', $this->officineA->id)
            ->getJson("/api/patients/{$patient->id}/historique-therapeutique");

        $resHist->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('historique.0.dci', 'Amoxicilline');
    }
}

<?php

namespace Tests\Feature;

use App\Models\Officine;
use App\Models\User;
use App\Models\UtilisateurOfficine;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class Partie2ConservationAutoEvaluationTest extends TestCase
{
    use DatabaseTransactions;

    protected Officine $officine;
    protected User $titulaire;

    protected function setUp(): void
    {
        parent::setUp();

        $this->officine = Officine::create([
            'id' => (string) Str::uuid(),
            'nom' => "Pharmacie Test BPD 2",
            'raison_sociale' => "Pharmacie Test SARL",
            'numero_licence' => "LIC-TEST-002",
            'adresse' => "Cotonou",
            'telephone' => "+229 00 00 00 02",
        ]);

        $this->titulaire = User::create([
            'id' => (string) Str::uuid(),
            'name' => "Dr Titulaire Test",
            'email' => "titulaire_p2@test.bj",
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
    }

    public function test_temperature_excursion_triggers_automatic_nc(): void
    {
        $this->actingAs($this->titulaire);

        // 1. Enregistrement d'une température normale (conforme)
        $respConforme = $this->postJson("/api/officines/{$this->officine->id}/temperatures", [
            'zone' => 'refrigeree_2_8',
            'temperature' => 4.5,
            'moment' => 'matin',
        ]);

        $respConforme->assertCreated();
        $this->assertFalse($respConforme->json('alerte_excursion'));
        $this->assertEquals('conforme', $respConforme->json('releve.statut_conformite'));

        // 2. Enregistrement d'une excursion haute frigo (> 8°C)
        $respExcursion = $this->postJson("/api/officines/{$this->officine->id}/temperatures", [
            'zone' => 'refrigeree_2_8',
            'temperature' => 11.2,
            'moment' => 'soir',
            'notes' => 'Porte mal refermée après livraison.',
        ]);

        $respExcursion->assertCreated();
        $this->assertTrue($respExcursion->json('alerte_excursion'));
        $this->assertEquals('excursion_haute', $respExcursion->json('releve.statut_conformite'));
        $this->assertNotNull($respExcursion->json('releve.non_conformite_id'));

        // Vérification de la fiche NC créée
        $this->assertDatabaseHas('non_conformites', [
            'id' => $respExcursion->json('releve.non_conformite_id'),
            'gravite' => 'critique',
            'source' => 'excursion_temperature',
        ]);
    }

    public function test_auto_evaluation_initialization_and_score_calculation(): void
    {
        $this->actingAs($this->titulaire);

        // 1. Récupération ou initialisation de la campagne
        $respCampagne = $this->getJson("/api/officines/{$this->officine->id}/auto-evaluation/campagne-courante");
        $respCampagne->assertOk();

        $evaluations = $respCampagne->json('evaluations');
        $this->assertNotEmpty($evaluations);
        $firstEvalId = $evaluations[0]['id'];
        $secondEvalId = $evaluations[1]['id'];

        // 2. Cotation du 1er article : Conforme (1 point)
        $respCotation1 = $this->putJson("/api/officines/{$this->officine->id}/auto-evaluation/evaluer/{$firstEvalId}", [
            'cotation' => 'conforme',
            'preuve' => 'Document QAM-DO-001 signé par le Titulaire.',
        ]);
        $respCotation1->assertOk();
        $this->assertEquals(100.0, $respCotation1->json('nouveau_score_global'));

        // 3. Cotation du 2nd article : Écart mineur (0.5 point)
        $respCotation2 = $this->putJson("/api/officines/{$this->officine->id}/auto-evaluation/evaluer/{$secondEvalId}", [
            'cotation' => 'ecart_mineur',
            'commentaire' => 'Mise à jour en cours par le RMQ.',
        ]);
        $respCotation2->assertOk();
        // Score = (1.0 + 0.5) / 2 = 75%
        $this->assertEquals(75.0, $respCotation2->json('nouveau_score_global'));

        // 4. Génération automatique d'un plan CAPA pour le 2nd article
        $respCapa = $this->postJson("/api/officines/{$this->officine->id}/auto-evaluation/generer-capa/{$secondEvalId}", [
            'action_corrective' => 'Réviser la procédure et former les dispensateurs sous 15 jours.',
            'cause_principale' => 'Manque de sensibilisation du personnel.',
        ]);
        $respCapa->assertCreated();
        $this->assertNotNull($respCapa->json('non_conformite.id'));
        $this->assertEquals('auto_inspection', $respCapa->json('non_conformite.source'));
    }
}

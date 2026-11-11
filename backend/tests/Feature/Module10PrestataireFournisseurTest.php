<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Achats\Models\Supplier;
use App\Modules\Achats\Models\SupplierComplaint;
use App\Modules\Achats\Models\SupplierContract;
use App\Modules\Achats\Models\SupplierEvaluationTemplate;
use App\Modules\Achats\Models\SupplierSelection;
use App\Modules\Qualite\Models\QualityAction;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Module10PrestataireFournisseurTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Officine $office;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::create([
            'name' => 'Titulaire Achats M10',
            'email' => 'admin-m10@example.test',
            'password' => 'Fictional12345',
        ]);
        $this->office = Officine::create([
            'name' => 'Pharmacie Recette M10',
            'slug' => 'pharmacie-recette-m10',
            'status' => 'active',
        ]);

        DB::table('officine_user')->insert([
            'user_id' => $this->admin->id,
            'officine_id' => $this->office->id,
            'is_admin' => true,
            'is_active' => true,
            'permissions' => '[]',
        ]);
        DB::table('officine_modules')->insert([
            ['officine_id' => $this->office->id, 'module' => 'qualite', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'achats', 'is_active' => true],
        ]);

        Sanctum::actingAs($this->admin);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    public function test_overview_indicators_with_non_disponible_default(): void
    {
        $res = $this->getJson('/api/v1/achats/overview');
        $res->assertOk();
        $res->assertJsonStructure([
            'meta' => ['officine_id', 'as_of'],
            'kpis' => [
                'total_suppliers',
                'active_suppliers',
                'qualified_suppliers',
                'pending_selections',
                'pending_evaluations',
                'open_complaints',
                'expiring_contracts',
                'average_score',
            ],
        ]);
        $this->assertEquals(0, $res->json('kpis.total_suppliers'));
        $this->assertEquals('non disponible', $res->json('kpis.average_score'));
    }

    public function test_supplier_crud_duplicate_check_and_optimistic_locking(): void
    {
        // 1. Création fournisseur + contact principal
        $createRes = $this->postJson('/api/v1/achats/suppliers', [
            'code' => 'FRN-UBPHAR',
            'name' => 'UBPHAR Bénin Grossiste',
            'type' => 'grossiste',
            'category' => 'produits_sante',
            'ifu' => '3201800112233',
            'rccm' => 'RB/COT/18 B 21045',
            'email' => 'commandes@ubphar.test',
            'phone' => '+229 21 30 40 50',
            'city' => 'Cotonou',
            'primary_contact_name' => 'Mme Kossiwa Dossou',
            'primary_contact_phone' => '+229 97 00 11 22',
            'primary_contact_email' => 'k.dossou@ubphar.test',
        ]);
        $createRes->assertCreated();
        $supplierId = $createRes->json('data.id');
        $this->assertCount(1, $createRes->json('data.contacts'));

        // 2. Contrôle des doublons (code ou nom identique)
        $dupRes = $this->postJson('/api/v1/achats/suppliers', [
            'code' => 'FRN-UBPHAR',
            'name' => 'Autre Nom',
            'type' => 'grossiste',
        ]);
        $dupRes->assertStatus(422);

        // 3. Conflit de version concurrentielle (409)
        $staleRes = $this->putJson("/api/v1/achats/suppliers/{$supplierId}", [
            'phone' => '+229 21 30 40 99',
            'version' => 99,
        ]);
        $staleRes->assertStatus(409);

        // 4. Mise à jour réussie avec version valide
        $okRes = $this->putJson("/api/v1/achats/suppliers/{$supplierId}", [
            'phone' => '+229 21 30 40 99',
            'version' => 1,
        ]);
        $okRes->assertOk();
        $this->assertEquals(2, $okRes->json('data.version'));
        $this->assertEquals('+229 21 30 40 99', $okRes->json('data.phone'));
    }

    public function test_selection_and_quote_comparison_titular_validation(): void
    {
        $s1 = Supplier::create([
            'officine_id' => $this->office->id,
            'code' => 'FRN-CLIM-A',
            'name' => 'Froid Médical Atlantique',
            'type' => 'maintenance',
            'category' => 'chaine_froid',
            'status' => 'actif',
            'version' => 1,
        ]);
        $s2 = Supplier::create([
            'officine_id' => $this->office->id,
            'code' => 'FRN-CLIM-B',
            'name' => 'Bénin Thermo Services',
            'type' => 'maintenance',
            'category' => 'chaine_froid',
            'status' => 'actif',
            'version' => 1,
        ]);

        // 1. Création d'un appel d'offres comparatif avec 2 devis
        $selRes = $this->postJson('/api/v1/achats/selections', [
            'reference' => 'AO-2026-001',
            'title' => 'Maintenance annuelle des enceintes réfrigérées BPD',
            'need_description' => 'Contrat de maintenance préventive trimestrielle + astreinte 24/7.',
            'selection_criteria' => [
                ['criterion' => 'Délai intervention astreinte', 'weight' => 40, 'target' => '< 4h'],
                ['criterion' => 'Coût forfaitaire annuel', 'weight' => 35, 'target' => '< 500 000 FCFA'],
                ['criterion' => 'Certification métrologie', 'weight' => 25, 'target' => 'Oui'],
            ],
            'quotes' => [
                [
                    'supplier_id' => $s1->id,
                    'amount' => 450000,
                    'delivery_days' => 1,
                    'technical_score' => 92,
                    'financial_score' => 88,
                    'total_score' => 90.5,
                ],
                [
                    'supplier_id' => $s2->id,
                    'amount' => 480000,
                    'delivery_days' => 3,
                    'technical_score' => 78,
                    'financial_score' => 80,
                    'total_score' => 78.8,
                ],
            ],
        ]);
        $selRes->assertCreated();
        $selectionId = $selRes->json('data.id');
        $this->assertEquals('comparaison', $selRes->json('data.status'));
        $this->assertCount(2, $selRes->json('data.quotes'));

        // 2. Validation par le Pharmacien Titulaire
        $valRes = $this->postJson("/api/v1/achats/selections/{$selectionId}/validate", [
            'decision' => 'valide',
            'selected_supplier_id' => $s1->id,
            'selection_justification' => 'Meilleur score technique (92/100) et astreinte garantie sous 2h.',
        ]);
        $valRes->assertOk();
        $this->assertEquals('valide', $valRes->json('data.status'));
        $this->assertEquals($s1->id, $valRes->json('data.selected_supplier_id'));

        // Le fournisseur retenu passe qualifié et son devis est retenu
        $s1->refresh();
        $this->assertEquals('qualifie', $s1->status);
        $this->assertDatabaseHas('supplier_quotes', [
            'selection_id' => $selectionId,
            'supplier_id' => $s1->id,
            'is_retained' => true,
        ]);

        // Impossible de re-statuer une sélection déjà validée
        $reValRes = $this->postJson("/api/v1/achats/selections/{$selectionId}/validate", [
            'decision' => 'rejete',
        ]);
        $reValRes->assertStatus(422);
    }

    public function test_evaluation_scoring_recalculates_average_and_creates_capa_on_unfavorable(): void
    {
        $supplier = Supplier::create([
            'officine_id' => $this->office->id,
            'code' => 'FRN-TRANS',
            'name' => 'PharmaLog Express',
            'type' => 'transporteur',
            'category' => 'chaine_froid',
            'status' => 'actif',
            'version' => 1,
        ]);

        $template = SupplierEvaluationTemplate::create([
            'officine_id' => $this->office->id,
            'code' => 'TPL-TRANS-BPD',
            'title' => 'Grille Transport Chaîne du Froid',
            'supplier_type' => 'transporteur',
            'criteria' => [
                ['key' => 'respect_temp', 'label' => 'Respect température 2-8°C', 'weight' => 50, 'max_score' => 5],
                ['key' => 'delai', 'label' => 'Ponctualité livraison', 'weight' => 50, 'max_score' => 5],
            ],
            'is_active' => true,
            'version' => 1,
        ]);

        // Évaluation défavorable ("a_ameliorer") -> note 2.5/5 (50%) + CAPA M4
        $evalRes = $this->postJson('/api/v1/achats/evaluations', [
            'supplier_id' => $supplier->id,
            'template_id' => $template->id,
            'period' => '2026-T1',
            'evaluation_date' => now()->toDateString(),
            'criteria_scores' => [
                ['key' => 'respect_temp', 'label' => 'Respect température 2-8°C', 'score' => 2],
                ['key' => 'delai', 'label' => 'Ponctualité livraison', 'score' => 3],
            ],
            'overall_score_on_5' => 2.5,
            'decision' => 'a_ameliorer',
            'strengths' => 'Personnel courtois',
            'weaknesses' => 'Retard de 4h sur la livraison vaccins + sonde non relevée au départ.',
            'action_required' => 'Exiger relevé thermique contradictoire au déchargement.',
        ]);
        $evalRes->assertCreated();
        $this->assertEquals(50.0, (float) $evalRes->json('data.percentage_score'));
        $actionId = $evalRes->json('data.created_action_id');
        $this->assertNotNull($actionId);

        $capa = QualityAction::withoutGlobalScopes()->find($actionId);
        $this->assertNotNull($capa);
        $this->assertEquals('Approvisionnement & Fournisseurs', $capa->chapter);

        $supplier->refresh();
        $this->assertEquals(2.5, (float) $supplier->average_rating);
    }

    public function test_complaint_creation_triggers_capa_and_resolution_records_credit(): void
    {
        $supplier = Supplier::create([
            'officine_id' => $this->office->id,
            'code' => 'FRN-GROS-2',
            'name' => 'COPHAR Bénin',
            'type' => 'grossiste',
            'category' => 'produits_sante',
            'status' => 'qualifie',
            'version' => 1,
        ]);

        // 1. Déclaration litige livraison -> création automatique CAPA M4
        $compRes = $this->postJson('/api/v1/achats/complaints', [
            'supplier_id' => $supplier->id,
            'reference' => 'LIT-2026-014',
            'claim_type' => 'livraison_non_conforme',
            'claim_date' => now()->toDateString(),
            'order_reference' => 'BC-2026-884',
            'delivery_note_ref' => 'BL-99102',
            'description' => '12 boîtes reçues avec péremption < 3 mois sans accord préalable.',
        ]);
        $compRes->assertCreated();
        $complaintId = $compRes->json('data.id');
        $this->assertEquals('ouvert', $compRes->json('data.status'));
        $this->assertNotNull($compRes->json('data.created_action_id'));

        $capa = QualityAction::withoutGlobalScopes()->find($compRes->json('data.created_action_id'));
        $this->assertNotNull($capa);
        $this->assertEquals('high', $capa->severity);

        // 2. Clôture / résolution avec avoir commercial
        $resRes = $this->postJson("/api/v1/achats/complaints/{$complaintId}/resolve", [
            'status' => 'avoir_emis',
            'supplier_response' => 'Reprise effectuée par le chauffeur et avoir N° AV-2026-310 émis.',
            'refund_or_credit_amount' => 78500,
        ]);
        $resRes->assertOk();
        $this->assertEquals('avoir_emis', $resRes->json('data.status'));
        $this->assertEquals(78500.0, (float) $resRes->json('data.refund_or_credit_amount'));
    }

    public function test_contract_creation_and_expiring_kpi(): void
    {
        $supplier = Supplier::create([
            'officine_id' => $this->office->id,
            'code' => 'FRN-SEC',
            'name' => 'Vigile Santé Protection',
            'type' => 'prestataire_service',
            'category' => 'securite',
            'status' => 'qualifie',
            'version' => 1,
        ]);

        $contractRes = $this->postJson('/api/v1/achats/contracts', [
            'supplier_id' => $supplier->id,
            'contract_ref' => 'CTR-SEC-2025',
            'title' => 'Télésurveillance et gardiennage officine',
            'start_date' => now()->subMonths(11)->toDateString(),
            'end_date' => now()->addDays(15)->toDateString(), // Expire sous 30 jours !
            'auto_renewal' => true,
            'notice_days' => 60,
            'terms_summary' => 'Couverture nocturne et jours fériés.',
        ]);
        $contractRes->assertCreated();
        $this->assertEquals('actif', $contractRes->json('data.status'));

        $ovRes = $this->getJson('/api/v1/achats/overview');
        $ovRes->assertOk();
        $this->assertEquals(1, $ovRes->json('kpis.expiring_contracts'));
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\LocauxEquipements\Models\CleaningPlan;
use App\Modules\LocauxEquipements\Models\Equipment;
use App\Modules\LocauxEquipements\Models\EquipmentLocation;
use App\Modules\LocauxEquipements\Models\EquipmentLocationHistory;
use App\Modules\LocauxEquipements\Models\EquipmentWithdrawal;
use App\Modules\LocauxEquipements\Models\GeneratorTest;
use App\Modules\LocauxEquipements\Models\MaintenanceEvent;
use App\Modules\LocauxEquipements\Models\MaintenancePlan;
use App\Modules\Qualite\Models\QualityAction;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Module9EquipementLocauxTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $technician;
    private Officine $office;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::create(['name' => 'Admin Locaux M9', 'email' => 'admin-m9@example.test', 'password' => 'Fictional12345']);
        $this->technician = User::create(['name' => 'Responsable Technique', 'email' => 'tech-m9@example.test', 'password' => 'Fictional12345']);
        $this->office = Officine::create(['name' => 'Pharmacie Recette M9', 'slug' => 'pharmacie-recette-m9', 'status' => 'active']);

        DB::table('officine_user')->insert([
            ['user_id' => $this->admin->id, 'officine_id' => $this->office->id, 'is_admin' => true, 'is_active' => true, 'permissions' => '[]'],
            ['user_id' => $this->technician->id, 'officine_id' => $this->office->id, 'is_admin' => false, 'is_active' => true, 'permissions' => '[]'],
        ]);
        DB::table('officine_modules')->insert([
            ['officine_id' => $this->office->id, 'module' => 'qualite', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'locauxequipements', 'is_active' => true],
        ]);

        Sanctum::actingAs($this->admin);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    public function test_overview_indicators(): void
    {
        $res = $this->getJson('/api/v1/locauxequipements/overview');
        $res->assertOk();
        $res->assertJsonStructure([
            'meta' => ['officine_id', 'as_of'],
            'kpis' => [
                'total_equipments',
                'in_service',
                'in_maintenance',
                'out_of_order',
                'withdrawn',
                'critical_bpd_count',
                'overdue_maintenances',
                'generator_last_test',
                'cleaning_completion_rate',
                'pending_withdrawals',
            ],
        ]);
        $this->assertEquals(0, $res->json('kpis.total_equipments'));
    }

    public function test_equipment_creation_and_location_history_tracking(): void
    {
        // 1. Création de zones / emplacements
        $loc1 = EquipmentLocation::create([
            'officine_id' => $this->office->id,
            'name' => 'Zone Chaîne du Froid BPD',
            'description' => 'Local climatisé hébergeant les enceintes 2-8°C',
            'is_active' => true,
        ]);
        $loc2 = EquipmentLocation::create([
            'officine_id' => $this->office->id,
            'name' => 'Réserve Générale',
            'description' => 'Stock tampon',
            'is_active' => true,
        ]);

        // 2. Création d'un équipement critique BPD
        $eqRes = $this->postJson('/api/v1/locauxequipements/equipments', [
            'code' => 'FRIGO-01',
            'designation' => 'Réfrigérateur Médical BPD Liebherr',
            'category' => 'froid',
            'brand' => 'Liebherr',
            'model' => 'MKv 3910',
            'serial_number' => 'SN-998877',
            'acquisition_year' => 2024,
            'current_location_id' => $loc1->id,
            'status' => 'en_service',
            'criticality' => 'critique_bpd',
            'notes' => 'Enceinte principale produits thermosensibles',
        ]);
        $eqRes->assertCreated();
        $eqId = $eqRes->json('data.id');

        // Vérification de la création de l'historique initial de localisation
        $initialHistory = EquipmentLocationHistory::where('officine_id', $this->office->id)
            ->where('equipment_id', $eqId)
            ->first();
        $this->assertNotNull($initialHistory);
        $this->assertEquals($loc1->id, $initialHistory->location_id);

        // 3. Déplacement de l'équipement vers la Réserve
        // CDC Section 7 : « historique des localisations conservé »
        $updateRes = $this->putJson("/api/v1/locauxequipements/equipments/{$eqId}", [
            'current_location_id' => $loc2->id,
            'location_change_reason' => 'Réaménagement temporaire lors des travaux de peinture',
            'version' => 1,
        ]);
        $updateRes->assertOk();
        $this->assertEquals($loc2->id, $updateRes->json('data.current_location_id'));

        $histories = EquipmentLocationHistory::where('officine_id', $this->office->id)
            ->where('equipment_id', $eqId)
            ->orderBy('id')
            ->get();
        $this->assertCount(2, $histories);
        $this->assertEquals($loc2->id, $histories[1]->location_id);
        $this->assertEquals('Réaménagement temporaire lors des travaux de peinture', $histories[1]->reason);
    }

    public function test_commissioning_test_conforming_sets_in_service(): void
    {
        $eq = Equipment::create([
            'officine_id' => $this->office->id,
            'code' => 'CLIM-01',
            'designation' => 'Climatiseur Inverter 18000 BTU',
            'category' => 'climatisation',
            'status' => 'en_panne', // Initialement non en service
            'criticality' => 'critique_bpd',
            'version' => 1,
        ]);

        // Fiche de mise en service (CDC 3.2)
        $comRes = $this->postJson("/api/v1/locauxequipements/equipments/{$eq->id}/commissioning", [
            'test_date' => now()->toDateString(),
            'electrical_safety_checked' => true,
            'functional_test_passed' => true,
            'temperature_conformity_passed' => true,
            'calibration_checked' => true,
            'staff_trained' => true,
            'decision' => 'conforme',
            'notes' => 'Installation conforme aux normes de sécurité électrique et BPD.',
        ]);
        $comRes->assertCreated();
        $this->assertEquals('conforme', $comRes->json('data.decision'));

        $eq->refresh();
        $this->assertEquals('en_service', $eq->status, 'Un test conforme doit basculer l’équipement en statut en_service.');
    }

    public function test_maintenance_event_verification_and_capa_bridge_on_failure(): void
    {
        $eq = Equipment::create([
            'officine_id' => $this->office->id,
            'code' => 'BAL-01',
            'designation' => 'Balance de Précision Analytique',
            'category' => 'pesage',
            'status' => 'en_service',
            'criticality' => 'critique_bpd',
            'version' => 1,
        ]);

        $plan = MaintenancePlan::create([
            'officine_id' => $this->office->id,
            'equipment_id' => $eq->id,
            'maintenance_type' => 'etalonnage',
            'frequency_days' => 180,
            'next_due_date' => now()->addDays(10)->toDateString(),
            'is_active' => true,
            'version' => 1,
        ]);

        // 1. Enregistrement d'une intervention avec résultat NON CONFORME (CDC 3.3)
        $eventRes = $this->postJson('/api/v1/locauxequipements/maintenance-events', [
            'equipment_id' => $eq->id,
            'maintenance_plan_id' => $plan->id,
            'intervention_type' => 'etalonnage',
            'intervention_date' => now()->toDateString(),
            'provider_name' => 'Laboratoire Métrologie Bénin',
            'technician_name' => 'Ing. Agbo',
            'description' => 'Écart de mesure de +0.8g constaté sur la masse étalon de 100g.',
            'result' => 'non_conforme',
            'cost' => 45000.0,
        ]);
        $eventRes->assertCreated();
        $eventId = $eventRes->json('data.id');
        $this->assertFalse($eventRes->json('data.is_verified'), 'Une intervention non vérifiée doit rester non vérifiée.');

        // Vérification de la création d'action CAPA M4 et mise en panne de l'équipement
        $eq->refresh();
        $this->assertEquals('en_panne', $eq->status);
        $this->assertNotNull($eventRes->json('data.created_action_id'));

        $capa = QualityAction::withoutGlobalScopes()->find($eventRes->json('data.created_action_id'));
        $this->assertNotNull($capa);
        $this->assertEquals('Locaux & Équipements', $capa->chapter);

        // 2. Vérification par le pharmacien titulaire (CDC 7 : « Une intervention non vérifiée reste distincte »)
        $verifyRes = $this->postJson("/api/v1/locauxequipements/maintenance-events/{$eventId}/verify");
        $verifyRes->assertOk();
        $this->assertTrue($verifyRes->json('data.is_verified'));
    }

    public function test_generator_test_critical_fuel_creates_quality_action(): void
    {
        $generator = Equipment::create([
            'officine_id' => $this->office->id,
            'code' => 'GRP-01',
            'designation' => 'Groupe Électrogène Insonorisé 25kVA Perkins',
            'category' => 'energie',
            'status' => 'en_service',
            'criticality' => 'critique_bpd',
            'version' => 1,
        ]);

        // Test avec carburant critique à 12% (< 25%) -> CDC 3.4
        $testRes = $this->postJson('/api/v1/locauxequipements/generator-tests', [
            'equipment_id' => $generator->id,
            'test_date' => now()->toDateString(),
            'fuel_level_percent' => 12.5,
            'start_delay_seconds' => 4,
            'oil_level_ok' => true,
            'battery_voltage_ok' => true,
            'frequency_hz' => 50.1,
            'test_result' => 'conforme', // démarrage ok mais carburant critique
            'comment' => 'Niveau cuve bas avant le weekend.',
        ]);
        $testRes->assertCreated();
        $this->assertNotNull($testRes->json('data.created_action_id'), 'Un niveau de carburant sous 25% doit créer une alerte/action qualité.');
    }

    public function test_cleaning_plan_and_occurrence_flow(): void
    {
        // 1. Création protocole de nettoyage (CDC 3.5)
        $planRes = $this->postJson('/api/v1/locauxequipements/cleaning-plans', [
            'zone_name' => 'Zone Réception & Quarantaine',
            'frequency' => 'quotidien',
            'cleaning_method' => 'Balayage humide et désinfection avec solution chlorée 0.5%',
            'products_used' => 'Eau de javel + Détergent neutre',
            'assigned_role' => 'Agent d’entretien',
        ]);
        $planRes->assertCreated();
        $planId = $planRes->json('data.id');

        // 2. Enregistrement occurrence réalisée
        $occRes = $this->postJson('/api/v1/locauxequipements/cleaning-occurrences', [
            'cleaning_plan_id' => $planId,
            'planned_date' => now()->toDateString(),
            'status' => 'realise',
            'anomalies_detected' => 'Rien à signaler, sol propre et sec.',
        ]);
        $occRes->assertCreated();
        $this->assertEquals('realise', $occRes->json('data.status'));

        // 3. Vérification de l'occurrence
        $verifyRes = $this->postJson("/api/v1/locauxequipements/cleaning-occurrences/{$occRes->json('data.id')}/verify");
        $verifyRes->assertOk();
        $this->assertTrue($verifyRes->json('data.is_verified'));
    }

    public function test_equipment_withdrawal_requires_titular_approval(): void
    {
        $eq = Equipment::create([
            'officine_id' => $this->office->id,
            'code' => 'CLIM-OLD',
            'designation' => 'Ancien Climatiseur Bureau Comptabilité',
            'category' => 'climatisation',
            'status' => 'en_service',
            'criticality' => 'standard',
            'version' => 1,
        ]);

        // 1. Soumission demande de retrait (CDC 3.6 & 7)
        $reqRes = $this->postJson('/api/v1/locauxequipements/withdrawals', [
            'equipment_id' => $eq->id,
            'request_date' => now()->toDateString(),
            'withdrawal_reason' => 'Compresseur grillé, coût de réparation supérieur à la valeur résiduelle.',
            'destination' => 'reforme',
        ]);
        $reqRes->assertCreated();
        $withdrawalId = $reqRes->json('data.id');

        // Règle CDC 7 : « retrait sans approbation refusé » -> l'équipement n'est PAS encore hors service
        $eq->refresh();
        $this->assertEquals('en_service', $eq->status);

        // 2. Approbation par le pharmacien titulaire (CDC 3.6)
        $decideRes = $this->postJson("/api/v1/locauxequipements/withdrawals/{$withdrawalId}/decision", [
            'decision' => 'approuve',
        ]);
        $decideRes->assertOk();
        $this->assertEquals('approuve', $decideRes->json('data.status'));

        // Statut équipement mis à jour en hors_service SANS supprimer l'enregistrement
        $eq->refresh();
        $this->assertEquals('hors_service', $eq->status);
        $this->assertDatabaseHas('equipments', ['id' => $eq->id, 'status' => 'hors_service']);
    }
}

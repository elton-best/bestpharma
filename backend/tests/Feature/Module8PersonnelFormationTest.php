<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Personnel\Models\Employee;
use App\Modules\Personnel\Models\LeaveBalance;
use App\Modules\Personnel\Models\LeaveRequest;
use App\Modules\Personnel\Models\TrainingPlan;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Module8PersonnelFormationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $collaborator;
    private Officine $office;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::create(['name' => 'Admin RH M8', 'email' => 'admin-m8@example.test', 'password' => 'Fictional12345']);
        $this->collaborator = User::create(['name' => 'Adjoint Pharmacie', 'email' => 'adjoint@example.test', 'password' => 'Fictional12345']);
        $this->office = Officine::create(['name' => 'Pharmacie Recette M8', 'slug' => 'pharmacie-recette-m8', 'status' => 'active']);

        DB::table('officine_user')->insert([
            ['user_id' => $this->admin->id, 'officine_id' => $this->office->id, 'is_admin' => true, 'is_active' => true, 'permissions' => '[]'],
            ['user_id' => $this->collaborator->id, 'officine_id' => $this->office->id, 'is_admin' => false, 'is_active' => true, 'permissions' => '[]'],
        ]);
        DB::table('officine_modules')->insert([
            ['officine_id' => $this->office->id, 'module' => 'qualite', 'is_active' => true],
            ['officine_id' => $this->office->id, 'module' => 'personnel', 'is_active' => true],
        ]);

        Sanctum::actingAs($this->admin);
        $this->withHeader('X-Officine-ID', (string) $this->office->id);
    }

    public function test_overview_indicators(): void
    {
        $res = $this->getJson('/api/v1/personnel/overview');
        $res->assertOk();
        $res->assertJsonStructure([
            'meta' => ['officine_id', 'year', 'as_of'],
            'kpis' => [
                'total_employees',
                'active_employees',
                'on_leave_employees',
                'total_job_descriptions',
                'pending_leaves',
                'shifts_this_month',
                'plans_this_year',
                'training_completion_rate',
                'expiring_credentials_count',
            ],
            'expiring_credentials',
        ]);
        $this->assertEquals(0, $res->json('kpis.total_employees'));
    }

    public function test_employee_crud_and_leave_balance_initialization(): void
    {
        // 1. Création collaborateur avec numéro Ordre B
        $res = $this->postJson('/api/v1/personnel/employees', [
            'matricule' => 'EMP-001',
            'first_name' => 'Ablawa',
            'last_name' => 'Koffi',
            'email' => 'ablawa.koffi@example.test',
            'phone' => '+229 97 00 11 22',
            'role_title' => 'Pharmacienne Assistante',
            'contract_type' => 'CDI',
            'hire_date' => '2025-01-15',
            'ordre_b_number' => 'OB-2024-889',
            'ordre_b_expiry' => '2027-12-31',
            'qualifications' => ['Diplôme d’État de Pharmacie', 'Certificat BPD ABMed'],
            'emergency_contact' => 'M. Koffi (+229 95 00 22 33)',
        ]);
        $res->assertCreated();
        $employeeId = $res->json('data.id');
        $this->assertEquals('EMP-001', $res->json('data.matricule'));

        // 2. Vérification de l'initialisation automatique du solde de congés (24 jours)
        $balance = LeaveBalance::where('officine_id', $this->office->id)
            ->where('employee_id', $employeeId)
            ->first();
        $this->assertNotNull($balance);
        $this->assertEquals(24.0, (float) $balance->acquired_days);
        $this->assertEquals(24.0, (float) $balance->remaining_days);

        // 3. Test unicité matricule
        $dupRes = $this->postJson('/api/v1/personnel/employees', [
            'matricule' => 'EMP-001',
            'first_name' => 'Autre',
            'last_name' => 'Doublon',
            'role_title' => 'Stagiaire',
            'contract_type' => 'Stage',
            'hire_date' => '2026-02-01',
        ]);
        $dupRes->assertStatus(422);
    }

    public function test_leave_request_approval_deducts_balance_while_refusal_does_not(): void
    {
        // Créer salarié
        $emp = Employee::create([
            'officine_id' => $this->office->id,
            'matricule' => 'EMP-002',
            'first_name' => 'Bio',
            'last_name' => 'Sanni',
            'role_title' => 'Préparateur en Pharmacie',
            'contract_type' => 'CDI',
            'hire_date' => '2024-06-01',
            'status' => 'actif',
            'version' => 1,
        ]);
        $currentYear = (int) date('Y');
        $balance = LeaveBalance::create([
            'officine_id' => $this->office->id,
            'employee_id' => $emp->id,
            'year' => $currentYear,
            'acquired_days' => 24.0,
            'taken_days' => 0.0,
            'remaining_days' => 24.0,
            'version' => 1,
        ]);

        // Demande 1 : 4 jours de congé annuel -> REFUSÉE
        // Règle d'or CDC 7 : « Une absence refusée ne réduit pas les droits »
        $req1Res = $this->postJson('/api/v1/personnel/leave-requests', [
            'employee_id' => $emp->id,
            'leave_type' => 'conge_annuel',
            'start_date' => "{$currentYear}-08-01",
            'end_date' => "{$currentYear}-08-04",
            'days_count' => 4.0,
            'reason' => 'Repos annuel période estivale',
        ]);
        $req1Res->assertCreated();
        $req1Id = $req1Res->json('data.id');

        $refuseRes = $this->postJson("/api/v1/personnel/leave-requests/{$req1Id}/decision", [
            'decision' => 'refuse',
            'decision_notes' => 'Période de haute activité / effectif insuffisant',
        ]);
        $refuseRes->assertOk();
        $this->assertEquals('refuse', $refuseRes->json('data.status'));

        $balance->refresh();
        $this->assertEquals(24.0, (float) $balance->remaining_days, 'Le solde restant ne doit PAS avoir diminué après un refus.');
        $this->assertEquals(0.0, (float) $balance->taken_days);

        // Demande 2 : 3 jours de congé annuel -> APPROUVÉE
        $req2Res = $this->postJson('/api/v1/personnel/leave-requests', [
            'employee_id' => $emp->id,
            'leave_type' => 'conge_annuel',
            'start_date' => "{$currentYear}-09-10",
            'end_date' => "{$currentYear}-09-12",
            'days_count' => 3.0,
            'reason' => 'Congé décalé',
        ]);
        $req2Res->assertCreated();
        $req2Id = $req2Res->json('data.id');

        $approveRes = $this->postJson("/api/v1/personnel/leave-requests/{$req2Id}/decision", [
            'decision' => 'approuve',
            'decision_notes' => 'Approuvé par Pharmacien Titulaire',
        ]);
        $approveRes->assertOk();
        $this->assertEquals('approuve', $approveRes->json('data.status'));

        $balance->refresh();
        $this->assertEquals(3.0, (float) $balance->taken_days);
        $this->assertEquals(21.0, (float) $balance->remaining_days, 'Le solde restant doit être exactement déduit de 3 jours.');
    }

    public function test_shift_conflict_detection(): void
    {
        $emp = Employee::create([
            'officine_id' => $this->office->id,
            'matricule' => 'EMP-003',
            'first_name' => 'Fati',
            'last_name' => 'Gomez',
            'role_title' => 'Rayonniste',
            'contract_type' => 'CDD',
            'hire_date' => '2026-01-01',
            'status' => 'actif',
            'version' => 1,
        ]);

        $shiftDate = now()->addDays(2)->toDateString();

        // 1. Premier créneau normal 08h-16h
        $shift1Res = $this->postJson('/api/v1/personnel/shifts', [
            'employee_id' => $emp->id,
            'shift_type' => 'jour',
            'shift_date' => $shiftDate,
            'start_time' => '08:00',
            'end_time' => '16:00',
            'status' => 'confirme',
        ]);
        $shift1Res->assertCreated();

        // 2. Deuxième créneau chevauchant 14h-22h pour le MÊME salarié le même jour
        // CDC 3.3 : Détection et signalement des conflits
        $shift2Res = $this->postJson('/api/v1/personnel/shifts', [
            'employee_id' => $emp->id,
            'shift_type' => 'garde_nuit',
            'shift_date' => $shiftDate,
            'start_time' => '14:00',
            'end_time' => '22:00',
        ]);
        $shift2Res->assertStatus(422);
        $this->assertStringContainsString('Conflit de planning', $shift2Res->json('message'));
    }

    public function test_training_plan_session_and_attendance_flow(): void
    {
        $emp = Employee::create([
            'officine_id' => $this->office->id,
            'matricule' => 'EMP-004',
            'first_name' => 'Marc',
            'last_name' => 'Akplogan',
            'role_title' => 'Pharmacien Adjoint',
            'contract_type' => 'CDI',
            'hire_date' => '2025-03-01',
            'status' => 'actif',
            'version' => 1,
        ]);

        // 1. Création Plan de formation annuel
        $planRes = $this->postJson('/api/v1/personnel/training-plans', [
            'year' => (int) date('Y'),
            'theme' => 'Bonnes Pratiques de Distribution ABMed & Gestion du Froid',
            'description' => 'Recyclage annuel sur les procédures de traçabilité et thermo-hygrométrie.',
            'training_type' => 'interne_bpd',
            'duration_hours' => 4,
            'trainer_organization' => 'Comité Qualité Interne',
            'target_audience' => 'Ensemble de l’équipe officinale',
        ]);
        $planRes->assertCreated();
        $planId = $planRes->json('data.id');

        // 2. Création Session
        $sessionDate = now()->addDays(5)->toDateString();
        $sessionRes = $this->postJson("/api/v1/personnel/training-plans/{$planId}/sessions", [
            'session_date' => $sessionDate,
            'start_time' => '09:00',
            'end_time' => '13:00',
            'location' => 'Salle de réunion Officine',
            'trainer_name' => 'Dr Mensah (Titulaire)',
            'attendees' => [
                ['employee_id' => $emp->id, 'presence_status' => 'present'],
            ],
        ]);
        $sessionRes->assertCreated();
        $sessionId = $sessionRes->json('data.id');

        // 3. Enregistrement présence et évaluation
        $evalRes = $this->postJson("/api/v1/personnel/training-sessions/{$sessionId}/attendances", [
            'attendances' => [
                [
                    'employee_id' => $emp->id,
                    'presence_status' => 'present',
                    'score' => 18.5,
                    'evaluation_comments' => 'Excellente maîtrise du relevé bi-quotidien des températures.',
                    'certificate_ref' => 'ATT-BPD-2026-04',
                ],
            ],
        ]);
        $evalRes->assertOk();
    }

    public function test_performance_review_creation(): void
    {
        $emp = Employee::create([
            'officine_id' => $this->office->id,
            'matricule' => 'EMP-005',
            'first_name' => 'Claire',
            'last_name' => 'Tossou',
            'role_title' => 'Responsable Achat & Stock',
            'contract_type' => 'CDI',
            'hire_date' => '2024-01-10',
            'status' => 'actif',
            'version' => 1,
        ]);

        $res = $this->postJson('/api/v1/personnel/performance-reviews', [
            'employee_id' => $emp->id,
            'review_type' => 'cadre',
            'review_period' => 'Année 2026',
            'review_date' => now()->toDateString(),
            'criteria_scores' => [
                ['criterion' => 'Rigueur dans la gestion des péremptions', 'score' => 17.5, 'weight' => 2, 'comment' => 'FEFO respecté'],
                ['criterion' => 'Respect des procédures BPD', 'score' => 18.0, 'weight' => 2, 'comment' => 'Parfait'],
                ['criterion' => 'Animation d’équipe', 'score' => 15.0, 'weight' => 1, 'comment' => 'Bonne communication'],
            ],
            'overall_score' => 17.2,
            'strengths' => 'Autonomie, proactivité et ponctualité exemplaire.',
            'improvements' => 'Déléguer davantage la vérification des cartons à la réception.',
            'action_plan' => 'Suivre un module perfectionnement gestion des stocks informatisée.',
            'status' => 'finalise',
            'is_confidential' => true,
        ]);
        $res->assertCreated();
        $this->assertEquals('cadre', $res->json('data.review_type'));
        $this->assertEquals(17.2, (float) $res->json('data.overall_score'));
    }
}

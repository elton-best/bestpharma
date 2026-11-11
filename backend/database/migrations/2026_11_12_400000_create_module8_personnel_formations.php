<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Activate personnel module for existing officines
        $officineIds = DB::table('officines')->pluck('id');
        foreach ($officineIds as $id) {
            DB::table('officine_modules')->updateOrInsert(
                ['officine_id' => $id, 'module' => 'personnel'],
                ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        // 2. Employees (dossiers salariés)
        Schema::create('employees', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('matricule');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('role_title');
            $table->string('contract_type')->default('CDI'); // CDI, CDD, Stage, Prestataire
            $table->date('hire_date');
            $table->string('status')->default('actif'); // actif, conge, suspendu, quitte
            $table->string('ordre_b_number')->nullable();
            $table->date('ordre_b_expiry')->nullable();
            $table->json('qualifications')->nullable();
            $table->string('emergency_contact')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'matricule']);
            $table->index(['officine_id', 'status']);
        });

        // 3. Job Descriptions (fiches de poste)
        Schema::create('job_descriptions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->string('code');
            $table->string('title');
            $table->string('department')->default('Pharmacie');
            $table->text('main_missions');
            $table->text('required_skills')->nullable();
            $table->text('required_profile')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'code']);
        });

        // 4. Leave Balances (droits et soldes de congés)
        Schema::create('leave_balances', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->decimal('acquired_days', 5, 2)->default(0);
            $table->decimal('taken_days', 5, 2)->default(0);
            $table->decimal('remaining_days', 5, 2)->default(0);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'employee_id', 'year']);
        });

        // 5. Leave Requests (demandes de congés & absences)
        Schema::create('leave_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('leave_type'); // conge_annuel, maladie, maternite, evenement_familial, sans_solde
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('days_count', 5, 2);
            $table->text('reason')->nullable();
            $table->string('status')->default('brouillon'); // brouillon, soumis, approuve, refuse, annule
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->text('decision_notes')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'status']);
        });

        // 6. Shifts (planning & gardes)
        Schema::create('shifts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('shift_type'); // jour, garde_nuit, garde_dimanche, astreinte
            $table->date('shift_date');
            $table->string('start_time', 10);
            $table->string('end_time', 10);
            $table->string('status')->default('planifie'); // planifie, confirme, effectue, remplace, annule
            $table->foreignId('replaced_by_employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'shift_date']);
        });

        // 7. Training Plans (plans de formation annuels)
        Schema::create('training_plans', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->string('theme');
            $table->text('description')->nullable();
            $table->string('trainer_organization')->nullable();
            $table->string('training_type')->default('interne_bpd'); // interne_bpd, externe, securite_incendie, pharmacovigilance
            $table->unsignedSmallInteger('duration_hours')->default(1);
            $table->string('target_audience')->nullable();
            $table->string('status')->default('planifie'); // planifie, en_cours, cloture, annule
            $table->date('target_date')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'year']);
        });

        // 8. Training Sessions (sessions de formation)
        Schema::create('training_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('training_plan_id')->constrained('training_plans')->cascadeOnDelete();
            $table->date('session_date');
            $table->string('start_time', 10)->nullable();
            $table->string('end_time', 10)->nullable();
            $table->string('location')->nullable();
            $table->string('trainer_name')->nullable();
            $table->string('status')->default('planifiee'); // planifiee, realisee, annulee
            $table->text('notes')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'training_plan_id']);
        });

        // 9. Training Attendances (participations & présences)
        Schema::create('training_attendances', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('training_session_id')->constrained('training_sessions')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('presence_status')->default('present'); // present, absent_justifie, absent_injustifie
            $table->decimal('score', 5, 2)->nullable();
            $table->text('evaluation_comments')->nullable();
            $table->string('certificate_ref')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['training_session_id', 'employee_id']);
        });

        // 10. Performance Reviews (évaluations des compétences)
        Schema::create('performance_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('officine_id')->constrained('officines')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('reviewer_id')->constrained('users')->cascadeOnDelete();
            $table->string('review_type'); // cadre, non_cadre
            $table->string('review_period');
            $table->date('review_date');
            $table->json('criteria_scores'); // array of criteria, scores, comments
            $table->decimal('overall_score', 5, 2)->default(0);
            $table->text('strengths')->nullable();
            $table->text('improvements')->nullable();
            $table->text('action_plan')->nullable();
            $table->string('status')->default('brouillon'); // brouillon, finalise
            $table->boolean('is_confidential')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->index(['officine_id', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('performance_reviews');
        Schema::dropIfExists('training_attendances');
        Schema::dropIfExists('training_sessions');
        Schema::dropIfExists('training_plans');
        Schema::dropIfExists('shifts');
        Schema::dropIfExists('leave_requests');
        Schema::dropIfExists('leave_balances');
        Schema::dropIfExists('job_descriptions');
        Schema::dropIfExists('employees');
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paie_baremes', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('officine_id')->index();
            $table->string('code', 30);
            $table->string('label', 150);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->decimal('cnss_employee_rate', 6, 4)->default(0.0360);
            $table->decimal('cnss_employer_rate', 6, 4)->default(0.1640);
            $table->decimal('its_rate', 6, 4)->default(0.1000);
            $table->decimal('overtime_multiplier', 5, 2)->default(1.25);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['officine_id', 'code']);
        });

        Schema::create('paie_variables', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('officine_id')->index();
            $table->unsignedBigInteger('employee_id')->index();
            $table->string('period_month', 7); // YYYY-MM
            $table->decimal('base_salary', 12, 2)->default(0);
            $table->decimal('primes', 12, 2)->default(0);
            $table->decimal('overtime_hours', 6, 2)->default(0);
            $table->decimal('overtime_hourly_rate', 10, 2)->default(0);
            $table->decimal('absences_deduction', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'employee_id', 'period_month']);
        });

        Schema::create('paie_bulletins', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('officine_id')->index();
            $table->unsignedBigInteger('employee_id')->index();
            $table->foreignId('bareme_id')->constrained('paie_baremes')->restrictOnDelete();
            $table->string('period_month', 7); // YYYY-MM
            $table->string('reference', 60);
            $table->string('idempotency_key', 120)->nullable();
            $table->decimal('gross_salary', 12, 2)->default(0);
            $table->decimal('cnss_employee', 12, 2)->default(0);
            $table->decimal('cnss_employer', 12, 2)->default(0);
            $table->decimal('its_tax', 12, 2)->default(0);
            $table->decimal('net_salary', 12, 2)->default(0);
            $table->string('status', 20)->default('brouillon'); // brouillon, valide, paye
            $table->unsignedBigInteger('validated_by_user_id')->nullable();
            $table->timestamp('validated_at')->nullable();
            $table->string('bulletin_hash', 64)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['officine_id', 'reference']);
            $table->unique(['officine_id', 'employee_id', 'period_month']);
            $table->index(['officine_id', 'idempotency_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paie_bulletins');
        Schema::dropIfExists('paie_variables');
        Schema::dropIfExists('paie_baremes');
    }
};

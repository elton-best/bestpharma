<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->boolean('is_platform_admin')->default(false));
        Schema::table('officines', function (Blueprint $t) {
            $t->foreignId('applicant_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $t->string('city', 120)->nullable();
            $t->string('address', 500)->nullable();
            $t->string('applicant_function', 120)->nullable();
            $t->text('review_note')->nullable();
            $t->timestamp('submitted_at')->nullable();
            $t->timestamp('reviewed_at')->nullable();
        });
    }
    public function down(): void
    {
        Schema::table('officines', function (Blueprint $t) {
            $t->dropConstrainedForeignId('applicant_user_id');
            $t->dropColumn(['city', 'address', 'applicant_function', 'review_note', 'submitted_at', 'reviewed_at']);
        });
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('is_platform_admin'));
    }
};

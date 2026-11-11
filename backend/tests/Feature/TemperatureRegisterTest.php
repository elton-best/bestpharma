<?php
namespace Tests\Feature;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TemperatureRegisterTest extends TestCase
{
    use RefreshDatabase;
    private User $user;
    private Officine $office;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::create(['name'=>'Temperature test','email'=>'temperature@example.test','password'=>'Fictional12345']);
        $this->office = Officine::create(['name'=>'Temperature office','slug'=>'temperature-office','status'=>'active']);
        DB::table('officine_user')->insert(['user_id'=>$this->user->id,'officine_id'=>$this->office->id,'is_active'=>true,'is_admin'=>true,'permissions'=>'[]']);
        DB::table('officine_modules')->insert(['officine_id'=>$this->office->id,'module'=>'locauxequipements','is_active'=>true]);
        Sanctum::actingAs($this->user);
        $this->withHeader('X-Officine-ID',(string)$this->office->id);
    }

    public function test_releve_requires_user_timestamp_and_does_not_invent_threshold_or_claim_follow_up(): void
    {
        $this->postJson('/api/v1/locauxequipements/temperatures',['zone'=>'refrigeree_2_8','temperature'=>4.3])->assertUnprocessable();
        $this->postJson('/api/v1/locauxequipements/temperatures',['zone'=>'refrigeree_2_8','temperature'=>4.3,'measured_at'=>'2026-11-09T08:45:00+01:00'])
            ->assertCreated()->assertJsonPath('data.conformity_status','a_evaluer')->assertJsonPath('alert',false);
        $this->assertDatabaseHas('temperature_records',['officine_id'=>$this->office->id,'temperature'=>4.3,'measured_at'=>'2026-11-09 07:45:00']);
    }

    public function test_csv_import_preserves_only_explicit_values_and_reports_invalid_rows(): void
    {
        $file=UploadedFile::fake()->createWithContent('temperature.csv',"Date;Heure;Température (°C);Humidité (%)\n2026-11-09;08:45;4.3;55\n;09:00;5.1;\n");
        $this->postJson('/api/v1/locauxequipements/temperatures/import',['zone'=>'refrigeree_2_8','file'=>$file])
            ->assertOk()->assertJsonPath('imported_count',1)->assertJsonPath('rejected_count',1)->assertJsonPath('rejected_rows.0.line',3);
        $this->assertDatabaseCount('temperature_records',1);
        $this->assertDatabaseHas('temperature_records',['temperature'=>4.3,'humidity'=>55]);
    }

    public function test_temperature_records_are_isolated_by_selected_tenant(): void
    {
        $this->postJson('/api/v1/locauxequipements/temperatures',['zone'=>'magasin_reserve','temperature'=>21,'measured_at'=>'2026-11-09T08:00:00Z'])->assertCreated();
        $other=Officine::create(['name'=>'Other temperature office','slug'=>'other-temperature-office','status'=>'active']);
        DB::table('officine_user')->insert(['user_id'=>$this->user->id,'officine_id'=>$other->id,'is_active'=>true,'is_admin'=>true,'permissions'=>'[]']);
        DB::table('officine_modules')->insert(['officine_id'=>$other->id,'module'=>'locauxequipements','is_active'=>true]);
        $this->withHeader('X-Officine-ID',(string)$other->id)->getJson('/api/v1/locauxequipements/temperatures')->assertOk()->assertJsonCount(0,'data');
    }
}

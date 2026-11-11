<?php
namespace Tests\Feature;
use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
final class PharmacyGuardsTest extends TestCase {
 use RefreshDatabase;
 private User $user; private Officine $office;
 protected function setUp():void{parent::setUp();$this->user=User::create(['name'=>'Garde test','email'=>'gardes@example.test','password'=>'Fictional12345']);$this->office=Officine::create(['name'=>'Officine test','slug'=>'gardes-test','status'=>'active']);DB::table('officine_user')->insert(['user_id'=>$this->user->id,'officine_id'=>$this->office->id,'is_active'=>true,'is_admin'=>true,'permissions'=>'[]']);Sanctum::actingAs($this->user);$this->withHeader('X-Officine-ID',(string)$this->office->id);}
 private function declaration(array $overrides=[]):array{return array_replace(['pharmacy_name'=>'Pharmacie déclarée','phone'=>'+229 01 23 45 67','address'=>'Adresse fournie','starts_at'=>'2026-11-12T08:00:00Z','ends_at'=>'2026-11-12T20:00:00Z','reason'=>'Déclaration manuelle'],$overrides);}
 public function test_declarations_are_scoped_and_phone_fields_are_preserved():void{$created=$this->postJson('/api/v1/gardes',$this->declaration())->assertCreated()->json('data');$this->assertSame('Pharmacie déclarée',$created['pharmacy_name']);$this->getJson('/api/v1/gardes')->assertOk()->assertJsonCount(1,'data');$other=Officine::create(['name'=>'Autre','slug'=>'autre-garde','status'=>'active']);DB::table('officine_user')->insert(['user_id'=>$this->user->id,'officine_id'=>$other->id,'is_active'=>true,'is_admin'=>true,'permissions'=>'[]']);$this->withHeader('X-Officine-ID',(string)$other->id);$this->getJson('/api/v1/gardes')->assertOk()->assertJsonCount(0,'data');$this->putJson('/api/v1/gardes/'.$created['id'],$this->declaration())->assertNotFound();}
 public function test_overlaps_and_non_positive_periods_are_rejected():void{$this->postJson('/api/v1/gardes',$this->declaration())->assertCreated();$this->postJson('/api/v1/gardes',$this->declaration(['starts_at'=>'2026-11-12T19:00:00Z','ends_at'=>'2026-11-13T03:00:00Z']))->assertUnprocessable();$this->postJson('/api/v1/gardes',$this->declaration(['starts_at'=>'2026-11-12T20:00:00Z','ends_at'=>'2026-11-12T20:00:00Z']))->assertUnprocessable();$this->assertDatabaseCount('pharmacy_guards',1);}
}

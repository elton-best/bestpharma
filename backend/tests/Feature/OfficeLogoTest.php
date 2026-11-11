<?php
namespace Tests\Feature;
use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
class OfficeLogoTest extends TestCase {
 use RefreshDatabase;
 private User $user;private Officine $office;
 protected function setUp():void {parent::setUp();Storage::fake('local');$this->user=User::create(['name'=>'Fictif','email'=>'user@example.test','password'=>'Fictional12345']);$this->office=Officine::create(['name'=>'Fictive','slug'=>'fictive','status'=>'active']);DB::table('officine_user')->insert(['officine_id'=>$this->office->id,'user_id'=>$this->user->id,'is_active'=>true,'is_admin'=>true,'permissions'=>'[]']);Sanctum::actingAs($this->user);$this->withHeader('X-Officine-ID',(string)$this->office->id);}
 public function test_logo_is_private_reencoded_versioned_and_removable():void {$this->postJson('/api/v1/officine/logo',['profile_version'=>1,'file'=>UploadedFile::fake()->image('fictif.jpg',40,40)])->assertOk();$row=DB::table('officines')->where('id',$this->office->id)->first();$this->assertSame(2,$row->profile_version);Storage::disk('local')->assertExists($row->logo_path);$this->assertSame(hash('sha256',Storage::disk('local')->get($row->logo_path)),$row->logo_sha256);$this->get('/api/v1/officine/logo')->assertOk()->assertHeader('Content-Type','image/png')->assertHeader('X-Content-Type-Options','nosniff');$this->postJson('/api/v1/officine/logo',['profile_version'=>1,'file'=>UploadedFile::fake()->image('stale.png')])->assertConflict();$this->assertCount(1,Storage::disk('local')->allFiles('office-logos'));$this->deleteJson('/api/v1/officine/logo',['profile_version'=>2])->assertOk();Storage::disk('local')->assertMissing($row->logo_path);$this->getJson('/api/v1/officine/logo')->assertNotFound();}
 public function test_non_admin_and_other_tenant_cannot_modify_or_read_logo():void {DB::table('officine_user')->where('user_id',$this->user->id)->update(['is_admin'=>false]);$this->postJson('/api/v1/officine/logo',['profile_version'=>1,'file'=>UploadedFile::fake()->image('fictif.png')])->assertForbidden();$this->withHeader('X-Officine-ID','99999')->getJson('/api/v1/officine/logo')->assertForbidden();}
 public function test_svg_and_oversized_dimensions_are_rejected():void {$this->postJson('/api/v1/officine/logo',['profile_version'=>1,'file'=>UploadedFile::fake()->createWithContent('logo.svg','<svg xmlns="http://www.w3.org/2000/svg"></svg>')])->assertUnprocessable();$this->postJson('/api/v1/officine/logo',['profile_version'=>1,'file'=>UploadedFile::fake()->image('wide.png',2001,1)])->assertUnprocessable();Storage::disk('local')->assertDirectoryEmpty('office-logos');}
}

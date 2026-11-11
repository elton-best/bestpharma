<?php
namespace Database\Seeders;
use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use App\Modules\Tenancy\Models\Organization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
class BestPharmaDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (!app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('Demo seeding is restricted to local/testing.');
        }
        $org = Organization::firstOrCreate(['slug' => 'beg-group'], ['name' => 'BEG Group']);
        $officine = Officine::firstOrCreate(['slug' => 'pharmacie-demo-cotonou'], ['organization_id' => $org->id, 'name' => 'Pharmacie Démo Cotonou', 'email' => 'contact@pharmacie-demo.bj', 'devise' => 'XOF', 'status' => 'active', 'onboarding_completed' => true]);
        $admin = User::firstOrCreate(['email' => 'admin@bestpharma.bj'], ['name' => 'Pharmacien Titulaire Démo', 'password' => Hash::make('password')]);
        $reviewer = User::firstOrCreate(['email' => 'beg@bestpharma.bj'], ['name' => 'Instruction BEG Démo', 'password' => Hash::make('password')]);
        $reviewer->forceFill(['is_platform_admin' => true, 'is_support_coordinator' => true])->save();
        $officine->users()->syncWithoutDetaching([$admin->id => ['is_admin' => true, 'permissions' => json_encode(['qualite.read', 'qualite.write'])]]);
        foreach (['tenancy', 'qualite', 'documents', 'locauxequipements', 'ventescaisse', 'dispensation'] as $module) {
            \Illuminate\Support\Facades\DB::table('officine_modules')->updateOrInsert(
                ['officine_id' => $officine->id, 'module' => $module],
                ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]
            );
        }
        $staff=User::firstOrCreate(['email'=>'accompagnateur@bestpharma.bj'],['name'=>'Accompagnateur fictif','password'=>Hash::make('password')]);
        $staff->forceFill(['is_support_staff'=>true])->save();
        $second=Officine::firstOrCreate(['slug'=>'pharmacie-demo-porto-novo'],['organization_id'=>$org->id,'name'=>'Pharmacie Démo Porto-Novo','status'=>'active','devise'=>'XOF']);
        $second->users()->syncWithoutDetaching([$admin->id=>['is_admin'=>true,'is_active'=>true,'permissions'=>'[]']]);
        foreach([$officine,$second] as $o){
            \Illuminate\Support\Facades\DB::table('officines')->where('id',$o->id)->whereNull('contact_name')->update(['contact_name'=>'Contact fictif','phone'=>'+2290100000000','city'=>$o->id===$officine->id?'Cotonou':'Porto-Novo','department'=>$o->id===$officine->id?'Littoral':'Ouémé','address'=>'Adresse fictive de validation']);
        }
        // Rôles démo : Pharmacien Titulaire, Pharmacien Adjoint, Préparateur, Caissier, Comptable, Responsable Qualité
        // Modules démo : tenancy, acl, users, workflow, qualite, documents, personnel, catalogue, stock, dispensation, ventes-caisse
    }
}

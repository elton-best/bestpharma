<?php

namespace Tests\Feature;

use App\Models\Officine;
use App\Models\User;
use App\Models\UtilisateurOfficine;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MultiTenantIsolationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_user_can_only_see_their_attached_officines(): void
    {
        $userA = User::factory()->create(['email' => 'user.a@test.bj']);
        $userB = User::factory()->create(['email' => 'user.b@test.bj']);

        $officineA = Officine::create([
            'nom' => 'Officine Alpha',
            'raison_sociale' => 'Officine Alpha SARL',
            'numero_licence' => 'LIC-TEST-A-'.uniqid(),
            'adresse' => 'Cotonou',
            'telephone' => '+229 97 11 11 11',
            'created_by' => $userA->id,
        ]);

        $officineB = Officine::create([
            'nom' => 'Officine Beta',
            'raison_sociale' => 'Officine Beta SARL',
            'numero_licence' => 'LIC-TEST-B-'.uniqid(),
            'adresse' => 'Porto-Novo',
            'telephone' => '+229 97 22 22 22',
            'created_by' => $userB->id,
        ]);

        UtilisateurOfficine::create([
            'officine_id' => $officineA->id,
            'user_id' => $userA->id,
            'role_code' => 'dispensateur',
            'actif' => true,
        ]);

        UtilisateurOfficine::create([
            'officine_id' => $officineB->id,
            'user_id' => $userB->id,
            'role_code' => 'dispensateur',
            'actif' => true,
        ]);

        // Requête de l'utilisateur A
        $responseA = $this->actingAs($userA)
            ->withHeader('X-Officine-Id', $officineA->id)
            ->getJson('/api/officines');

        $responseA->assertOk();
        $officineIdsA = collect($responseA->json())->pluck('id')->all();

        $this->assertContains($officineA->id, $officineIdsA);
        $this->assertNotContains($officineB->id, $officineIdsA);

        // Requête de l'utilisateur B
        $responseB = $this->actingAs($userB)
            ->withHeader('X-Officine-Id', $officineB->id)
            ->getJson('/api/officines');

        $responseB->assertOk();
        $officineIdsB = collect($responseB->json())->pluck('id')->all();

        $this->assertContains($officineB->id, $officineIdsB);
        $this->assertNotContains($officineA->id, $officineIdsB);
    }

    public function test_unattached_user_sees_no_officines(): void
    {
        $userWithoutOfficine = User::factory()->create(['email' => 'alone@test.bj']);

        $response = $this->actingAs($userWithoutOfficine)
            ->getJson('/api/officines');

        $response->assertOk();
        $this->assertEmpty($response->json());
    }

    public function test_postgres_rls_function_filters_correctly(): void
    {
        $user = User::factory()->create(['email' => 'rls@test.bj']);
        $officine = Officine::create([
            'nom' => 'Officine RLS',
            'raison_sociale' => 'Officine RLS SARL',
            'numero_licence' => 'LIC-RLS-'.uniqid(),
            'adresse' => 'Cotonou',
            'telephone' => '+229 97 33 33 33',
            'created_by' => $user->id,
        ]);

        UtilisateurOfficine::create([
            'officine_id' => $officine->id,
            'user_id' => $user->id,
            'role_code' => 'pharmacien_titulaire',
            'actif' => true,
        ]);

        // Simule le positionnement du contexte session PostgreSQL
        DB::select("SELECT set_config('app.current_user_id', ?, true)", [(string) $user->id]);

        $accessible = DB::select('SELECT public.user_officines() as officine_id');
        $ids = array_map(fn ($row) => $row->officine_id, $accessible);

        $this->assertContains($officine->id, $ids);
    }
}

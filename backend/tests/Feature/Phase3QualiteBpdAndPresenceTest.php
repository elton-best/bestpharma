<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Tenancy\Models\Officine;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class Phase3QualiteBpdAndPresenceTest extends TestCase
{
    use DatabaseTransactions;

    protected function makeUserFor(Officine $officine, array $permissions = ['qualite.read', 'qualite.write', 'stock.read', 'stock.write']): User
    {
        $user = User::create([
            'name' => 'Pharmacien Test ' . uniqid(),
            'email' => 'pharmacien-' . uniqid() . '@example.test',
            'password' => bcrypt('password123'),
        ]);

        DB::table('officine_user')->insert([
            'officine_id' => $officine->id,
            'user_id' => $user->id,
            'is_admin' => true,
            'is_active' => true,
            'permissions' => json_encode($permissions),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach (['qualite', 'stock', 'locauxequipements'] as $mod) {
            DB::table('officine_modules')->updateOrInsert(
                ['officine_id' => $officine->id, 'module' => $mod],
                ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        return $user;
    }

    public function test_autoeval_267_articles_score_and_capa_link(): void
    {
        $officine = Officine::create([
            'slug' => 'pharmacie-test-autoeval-' . uniqid(),
            'name' => 'Pharmacie Test AutoEval',
            'status' => 'active',
            'devise' => 'XOF',
        ]);
        $user = $this->makeUserFor($officine);

        // 1. Enregistrement d'une campagne d'auto-évaluation 267 articles
        $resCampagne = $this->actingAs($user)
            ->withHeaders(['X-Officine-ID' => (string) $officine->id])
            ->postJson('/api/v1/qualite/cdc-extras/autoeval', [
                'reference' => 'AUTO-2026-T4',
                'title' => 'Campagne Annuelle 267 Articles BPD ABMed',
                'total_articles' => 267,
                'compliant_count' => 240,
                'non_compliant_count' => 27,
                'notes' => 'Écarts identifiés sur la chaîne du froid et la traçabilité des stupéfiants.',
            ]);
        $resCampagne->assertCreated();
        $campaignId = (int) $resCampagne->json('data.id');
        $this->assertEquals(267, $resCampagne->json('data.total_articles'));
        $this->assertEquals(89.89, $resCampagne->json('data.score_percent'));

        // 2. Création d'une action corrective CAPA pour un écart BPD
        $resCapa = $this->actingAs($user)
            ->withHeaders(['X-Officine-ID' => (string) $officine->id])
            ->postJson("/api/v1/qualite/cdc-extras/autoeval/{$campaignId}/capa", [
                'article_code' => 'Art. 5.2',
                'chapter' => 'Approvisionnements & Stocks',
                'severity' => 'high',
                'description' => 'Mise en place obligatoire du tri FEFO automatique au comptoir de vente.',
                'due_date' => now()->addDays(15)->toDateString(),
                'owner' => 'Pharmacien Titulaire',
            ]);
        $resCapa->assertCreated();
        $this->assertNotEmpty($resCapa->json('data.id'));
        $this->assertEquals('open', $resCapa->json('data.status'));
    }

    public function test_pharmacist_presence_rule_art_1_11_and_clocking(): void
    {
        $officine = Officine::create([
            'slug' => 'pharmacie-test-presence-' . uniqid(),
            'name' => 'Pharmacie Test Présence',
            'status' => 'active',
            'devise' => 'XOF',
        ]);
        $user = $this->makeUserFor($officine);

        // 1. Aucun pharmacien pointé aujourd'hui -> Alerte absence
        $resStatusBefore = $this->actingAs($user)
            ->withHeaders(['X-Officine-ID' => (string) $officine->id])
            ->getJson('/api/v1/qualite/cdc-extras/presence/pharmacist-status');
        $resStatusBefore->assertOk();
        $this->assertFalse($resStatusBefore->json('data.pharmacist_present'));
        $this->assertEquals('alerte_absence', $resStatusBefore->json('data.status'));

        // 2. Pointage du pharmacien titulaire (arrivée)
        $resPunch = $this->actingAs($user)
            ->withHeaders(['X-Officine-ID' => (string) $officine->id])
            ->postJson('/api/v1/qualite/cdc-extras/presence', [
                'staff_name' => 'Dr. Titulaire Test',
                'role_badge' => 'Pharmacien Titulaire',
                'work_date' => date('Y-m-d'),
                'check_in_at' => '07:45',
                'pharmacist_present' => true,
                'notes' => 'Prise de service matinale',
            ]);
        $resPunch->assertCreated();

        // 3. Statut en direct -> Conforme Art. 1.11 BPD
        $resStatusAfter = $this->actingAs($user)
            ->withHeaders(['X-Officine-ID' => (string) $officine->id])
            ->getJson('/api/v1/qualite/cdc-extras/presence/pharmacist-status');
        $resStatusAfter->assertOk();
        $this->assertTrue($resStatusAfter->json('data.pharmacist_present'));
        $this->assertEquals('conforme', $resStatusAfter->json('data.status'));
        $this->assertEquals(1, $resStatusAfter->json('data.active_count'));
    }

    public function test_temperature_excursion_detects_out_of_bounds_and_creates_capa(): void
    {
        $officine = Officine::create([
            'slug' => 'pharmacie-test-temp-' . uniqid(),
            'name' => 'Pharmacie Test Température',
            'status' => 'active',
            'devise' => 'XOF',
        ]);
        $user = $this->makeUserFor($officine);

        // Relevé hors plage (9.8°C sur enceinte 2-8°C)
        $resExcursion = $this->actingAs($user)
            ->withHeaders(['X-Officine-ID' => (string) $officine->id])
            ->postJson('/api/v1/stock/temperatures', [
                'zone_name' => 'Enceinte Réfrigérée Vaccins (2-8°C)',
                'measured_temperature' => 9.8,
                'min_threshold' => 2.0,
                'max_threshold' => 8.0,
                'incident_notes' => 'Alerte coupure secteur temporaire',
            ]);
        $resExcursion->assertCreated();
        $this->assertTrue($resExcursion->json('data.is_excursion'));
        $this->assertEquals('incident_ouvert', $resExcursion->json('data.effectiveness_status'));
        $this->assertNotNull($resExcursion->json('data.created_action_id'));
    }
}

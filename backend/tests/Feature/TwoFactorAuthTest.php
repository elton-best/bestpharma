<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorAuthTest extends TestCase
{
    use DatabaseTransactions;

    public function test_login_enforces_mfa_for_promoteur_role(): void
    {
        $google2fa = new Google2FA;
        $secret = $google2fa->generateSecretKey();

        $user = User::create([
            'name' => 'Promoteur Test',
            'email' => 'promoteur.test@test.bj',
            'password' => Hash::make('Secret123!'),
            'mfa_secret' => $secret,
            'mfa_enabled' => true,
            'mfa_enforced' => true,
            'actif' => true,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'promoteur.test@test.bj',
            'password' => 'Secret123!',
        ]);

        $response->assertOk();
        $response->assertJson([
            'mfa_required' => true,
            'mfa_setup_required' => false,
        ]);
        $this->assertArrayHasKey('temp_token', $response->json());

        // Vérification avec code TOTP valide
        $validCode = $google2fa->getCurrentOtp($secret);

        $verifyResponse = $this->withHeader('Authorization', 'Bearer '.$response->json('temp_token'))
            ->postJson('/api/auth/verify-mfa', [
                'code' => $validCode,
            ]);

        $verifyResponse->assertOk();
        $this->assertArrayHasKey('token', $verifyResponse->json());
    }

    public function test_mfa_fails_with_invalid_code(): void
    {
        $google2fa = new Google2FA;
        $secret = $google2fa->generateSecretKey();

        $user = User::create([
            'name' => 'Pharmacien Test',
            'email' => 'pharma.test@test.bj',
            'password' => Hash::make('Secret123!'),
            'mfa_secret' => $secret,
            'mfa_enabled' => true,
            'actif' => true,
        ]);

        $tempToken = $user->createToken('mfa-token', ['mfa:verify'])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$tempToken)
            ->postJson('/api/auth/verify-mfa', [
                'code' => '000000',
            ]);

        $response->assertStatus(422);
    }

    public function test_devices_listing_and_remote_revocation(): void
    {
        $user = User::factory()->create();
        $token1 = $user->createToken('Tablette Borne', ['*']);
        $token2 = $user->createToken('Mobile Perso', ['*']);

        $response = $this->withHeader('Authorization', 'Bearer '.$token1->plainTextToken)
            ->getJson('/api/auth/devices');

        $response->assertOk();
        $devices = $response->json('devices');
        $this->assertCount(2, $devices);

        // Révocation à distance du 2ème appareil (DSH-13)
        $revokeResponse = $this->withHeader('Authorization', 'Bearer '.$token1->plainTextToken)
            ->deleteJson("/api/auth/devices/{$token2->accessToken->id}");

        $revokeResponse->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token2->accessToken->id]);
    }
}

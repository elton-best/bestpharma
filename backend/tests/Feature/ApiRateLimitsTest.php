<?php
namespace Tests\Feature;

class ApiRateLimitsTest extends \Tests\TestCase
{
    public function test_login_does_not_consume_registration_or_acceptance_quota(): void
    {
        // Invalid payloads avoid creating real records and still exercise the middleware.
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [])->assertUnprocessable();
        }
        $this->postJson('/api/v1/auth/login', [])->assertTooManyRequests();
        $this->postJson('/api/v1/auth/register', [])->assertUnprocessable();
        $this->postJson('/api/v1/invitations/accept', [])->assertUnprocessable();
    }
}

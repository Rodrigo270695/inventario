<?php

namespace Tests\Feature\Agent;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgentReportApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_reports_returns_401_without_token(): void
    {
        $this->postJson('/api/agent/reports', [
            'asset_id' => '00000000-0000-4000-8000-000000000001',
            'payload' => ['test' => true],
        ])->assertStatus(401);
    }

    public function test_reports_returns_401_with_invalid_token_format(): void
    {
        $this->postJson('/api/agent/reports', [
            'asset_id' => '00000000-0000-4000-8000-000000000001',
            'payload' => ['test' => true],
        ], [
            'Authorization' => 'Bearer not-a-valid-format',
        ])->assertStatus(401);
    }
}

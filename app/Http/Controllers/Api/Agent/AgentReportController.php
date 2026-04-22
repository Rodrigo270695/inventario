<?php

namespace App\Http\Controllers\Api\Agent;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Agent\StoreAgentReportRequest;
use App\Models\AgentReport;
use Illuminate\Http\JsonResponse;

class AgentReportController extends Controller
{
    public function store(StoreAgentReportRequest $request): JsonResponse
    {
        $data = $request->validated();

        $report = AgentReport::query()->create([
            'asset_id' => $data['asset_id'],
            'payload' => $data['payload'],
            'reported_at' => isset($data['reported_at']) ? $data['reported_at'] : now(),
            'is_full_snapshot' => (bool) ($data['is_full_snapshot'] ?? true),
        ]);

        return response()->json([
            'id' => $report->id,
            'message' => 'Reporte registrado correctamente.',
        ], 201);
    }
}

<?php

namespace App\Http\Controllers\Api\Agent;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Agent\StoreAgentReportRequest;
use App\Models\AgentReport;
use App\Services\Agent\ProcessAgentReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AgentReportController extends Controller
{
    public function store(StoreAgentReportRequest $request, ProcessAgentReport $processor): JsonResponse
    {
        $data = $request->validated();
        $reportedAt = isset($data['reported_at']) ? $data['reported_at'] : now();
        $payload = $data['payload'];

        $report = DB::transaction(function () use ($data, $reportedAt, $payload, $processor) {
            $report = AgentReport::query()->create([
                'asset_id' => $data['asset_id'],
                'payload' => $payload,
                'reported_at' => $reportedAt,
                'is_full_snapshot' => (bool) ($data['is_full_snapshot'] ?? true),
            ]);

            $processor->syncAssetComputer($data['asset_id'], $payload, $reportedAt);

            return $report;
        });

        return response()->json([
            'id' => $report->id,
            'message' => 'Reporte registrado correctamente.',
        ], 201);
    }
}

<?php

namespace App\Http\Controllers\Api\Agent;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Agent\StoreAgentReportRequest;
use App\Models\AgentReport;
use App\Models\UnmatchedAgentReport;
use App\Services\Agent\ProcessAgentReport;
use App\Services\Agent\ResolveAgentAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AgentReportController extends Controller
{
    public function store(
        StoreAgentReportRequest $request,
        ProcessAgentReport $processor,
        ResolveAgentAsset $resolver,
    ): JsonResponse {
        $data = $request->validated();
        $reportedAt = isset($data['reported_at']) ? $data['reported_at'] : now();
        $payload = $data['payload'];
        $explicitAssetId = isset($data['asset_id']) ? (string) $data['asset_id'] : null;

        $resolved = $resolver->resolve($explicitAssetId, $payload);

        if (! $resolved['ok'] || $resolved['asset_id'] === null) {
            $unmatched = UnmatchedAgentReport::query()->create([
                'payload' => $payload,
                'bios_serial' => $resolved['serial'],
                'mac_address' => $resolved['mac'],
                'hostname' => $resolved['hostname'],
                'reason' => $resolved['reason'] ?? ResolveAgentAsset::REASON_NOT_FOUND,
                'candidate_count' => count($resolved['candidate_asset_ids']),
                'candidate_asset_ids' => $resolved['candidate_asset_ids'] ?: null,
                'reported_at' => $reportedAt,
                'is_full_snapshot' => (bool) ($data['is_full_snapshot'] ?? true),
            ]);

            $messages = [
                ResolveAgentAsset::REASON_MISSING_IDENTITY => 'No se pudo identificar el equipo: falta serial BIOS y MAC.',
                ResolveAgentAsset::REASON_AMBIGUOUS => 'Hay varios activos con el mismo serial/MAC. Revise en Auditoría → Sin vincular.',
                ResolveAgentAsset::REASON_NOT_FOUND => 'No se encontró activo con ese serial/MAC. Revise en Auditoría → Sin vincular.',
            ];

            return response()->json([
                'message' => $messages[$resolved['reason']] ?? 'No se pudo vincular el reporte a un activo.',
                'reason' => $resolved['reason'],
                'unmatched_id' => $unmatched->id,
                'serial' => $resolved['serial'],
                'mac_address' => $resolved['mac'],
                'candidate_count' => count($resolved['candidate_asset_ids']),
            ], 422);
        }

        $assetId = $resolved['asset_id'];

        $report = DB::transaction(function () use ($data, $reportedAt, $payload, $processor, $assetId) {
            $report = AgentReport::query()->create([
                'asset_id' => $assetId,
                'payload' => $payload,
                'reported_at' => $reportedAt,
                'is_full_snapshot' => (bool) ($data['is_full_snapshot'] ?? true),
            ]);

            $processor->syncAssetComputer($assetId, $payload, $reportedAt);

            return $report;
        });

        return response()->json([
            'id' => $report->id,
            'asset_id' => $assetId,
            'matched_by' => $resolved['matched_by'],
            'message' => 'Reporte registrado correctamente.',
        ], 201);
    }
}

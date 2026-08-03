<?php

namespace App\Services\Agent;

use App\Models\AssetComputer;
use Illuminate\Support\Carbon;

class ProcessAgentReport
{
    /**
     * Actualiza (o crea) la ficha PC del activo con claves conocidas del payload.
     * Solo pisa campos presentes y no vacíos; no borra datos previos con null.
     *
     * @param  array<string, mixed>  $payload
     */
    public function syncAssetComputer(string $assetId, array $payload, Carbon|string|null $reportedAt = null): AssetComputer
    {
        $computer = AssetComputer::query()->firstOrNew(['asset_id' => $assetId]);

        $hostname = $this->stringOrNull($payload['hostname'] ?? null);
        if ($hostname !== null) {
            $computer->hostname = mb_substr($hostname, 0, 255);
        }

        $bios = $this->stringOrNull($payload['bios_serial'] ?? null);
        if ($bios !== null) {
            $computer->bios_serial = mb_substr($bios, 0, 200);
        }

        $ip = $this->stringOrNull($payload['ip_address'] ?? null);
        if ($ip !== null) {
            $computer->ip_address = mb_substr($ip, 0, 45);
        }

        $mac = $this->normalizeMac($payload['mac_address'] ?? null);
        if ($mac !== null) {
            $computer->mac_address = mb_substr($mac, 0, 50);
        }

        $computer->last_seen_at = $reportedAt
            ? Carbon::parse($reportedAt)
            : now();

        $computer->save();

        return $computer;
    }

    private function stringOrNull(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        if (! is_scalar($value)) {
            return null;
        }
        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function normalizeMac(mixed $value): ?string
    {
        $raw = $this->stringOrNull($value);
        if ($raw === null) {
            return null;
        }

        $hex = preg_replace('/[^0-9A-Fa-f]/', '', $raw) ?? '';
        if (strlen($hex) !== 12) {
            return strtoupper($raw);
        }

        $parts = str_split(strtoupper($hex), 2);

        return implode(':', $parts);
    }
}

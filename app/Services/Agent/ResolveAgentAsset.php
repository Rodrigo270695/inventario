<?php

namespace App\Services\Agent;

use App\Models\Asset;
use App\Models\AssetComputer;
use Illuminate\Support\Collection;

class ResolveAgentAsset
{
    public const REASON_EXPLICIT = 'explicit';

    public const REASON_SERIAL = 'serial';

    public const REASON_MAC = 'mac';

    public const REASON_NOT_FOUND = 'not_found';

    public const REASON_AMBIGUOUS = 'ambiguous';

    public const REASON_MISSING_IDENTITY = 'missing_identity';

    /**
     * @param  array<string, mixed>  $payload
     * @return array{
     *     ok: bool,
     *     asset_id: ?string,
     *     matched_by: ?string,
     *     reason: ?string,
     *     candidate_asset_ids: list<string>,
     *     serial: ?string,
     *     mac: ?string,
     *     hostname: ?string
     * }
     */
    public function resolve(?string $explicitAssetId, array $payload): array
    {
        $serial = $this->extractSerial($payload);
        $mac = $this->normalizeMac($payload['mac_address'] ?? null);
        $hostname = $this->stringOrNull($payload['hostname'] ?? null);

        if (is_string($explicitAssetId) && trim($explicitAssetId) !== '') {
            $exists = Asset::query()->whereKey($explicitAssetId)->exists();
            if ($exists) {
                return [
                    'ok' => true,
                    'asset_id' => $explicitAssetId,
                    'matched_by' => self::REASON_EXPLICIT,
                    'reason' => null,
                    'candidate_asset_ids' => [$explicitAssetId],
                    'serial' => $serial,
                    'mac' => $mac,
                    'hostname' => $hostname,
                ];
            }
        }

        if ($serial !== null) {
            $ids = $this->findAssetIdsBySerial($serial);
            if ($ids->count() === 1) {
                return [
                    'ok' => true,
                    'asset_id' => $ids->first(),
                    'matched_by' => self::REASON_SERIAL,
                    'reason' => null,
                    'candidate_asset_ids' => $ids->values()->all(),
                    'serial' => $serial,
                    'mac' => $mac,
                    'hostname' => $hostname,
                ];
            }
            if ($ids->count() > 1) {
                return [
                    'ok' => false,
                    'asset_id' => null,
                    'matched_by' => null,
                    'reason' => self::REASON_AMBIGUOUS,
                    'candidate_asset_ids' => $ids->values()->all(),
                    'serial' => $serial,
                    'mac' => $mac,
                    'hostname' => $hostname,
                ];
            }
        }

        if ($mac !== null) {
            $ids = $this->findAssetIdsByMac($mac);
            if ($ids->count() === 1) {
                return [
                    'ok' => true,
                    'asset_id' => $ids->first(),
                    'matched_by' => self::REASON_MAC,
                    'reason' => null,
                    'candidate_asset_ids' => $ids->values()->all(),
                    'serial' => $serial,
                    'mac' => $mac,
                    'hostname' => $hostname,
                ];
            }
            if ($ids->count() > 1) {
                return [
                    'ok' => false,
                    'asset_id' => null,
                    'matched_by' => null,
                    'reason' => self::REASON_AMBIGUOUS,
                    'candidate_asset_ids' => $ids->values()->all(),
                    'serial' => $serial,
                    'mac' => $mac,
                    'hostname' => $hostname,
                ];
            }
        }

        if ($serial === null && $mac === null) {
            return [
                'ok' => false,
                'asset_id' => null,
                'matched_by' => null,
                'reason' => self::REASON_MISSING_IDENTITY,
                'candidate_asset_ids' => [],
                'serial' => null,
                'mac' => null,
                'hostname' => $hostname,
            ];
        }

        return [
            'ok' => false,
            'asset_id' => null,
            'matched_by' => null,
            'reason' => self::REASON_NOT_FOUND,
            'candidate_asset_ids' => [],
            'serial' => $serial,
            'mac' => $mac,
            'hostname' => $hostname,
        ];
    }

    /**
     * @return Collection<int, string>
     */
    private function findAssetIdsBySerial(string $serial): Collection
    {
        $needle = mb_strtolower($serial);

        $fromAssets = Asset::query()
            ->whereNotNull('serial_number')
            ->whereRaw('LOWER(TRIM(serial_number)) = ?', [$needle])
            ->pluck('id');

        $fromComputers = AssetComputer::query()
            ->whereNotNull('bios_serial')
            ->whereRaw('LOWER(TRIM(bios_serial)) = ?', [$needle])
            ->pluck('asset_id');

        return $fromAssets->merge($fromComputers)->unique()->values();
    }

    /**
     * @return Collection<int, string>
     */
    private function findAssetIdsByMac(string $mac): Collection
    {
        $hex = strtoupper(preg_replace('/[^0-9A-Fa-f]/', '', $mac) ?? '');
        if (strlen($hex) !== 12) {
            return collect();
        }

        return AssetComputer::query()
            ->whereNotNull('mac_address')
            ->where(function ($query) use ($mac, $hex): void {
                $query
                    ->whereRaw('UPPER(mac_address) = ?', [strtoupper($mac)])
                    ->orWhereRaw(
                        "UPPER(REPLACE(REPLACE(REPLACE(mac_address, ':', ''), '-', ''), '.', '')) = ?",
                        [$hex]
                    );
            })
            ->pluck('asset_id')
            ->unique()
            ->values();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function extractSerial(array $payload): ?string
    {
        $candidates = [
            $payload['bios_serial'] ?? null,
            $payload['serial_number'] ?? null,
            $payload['system_serial'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            $serial = $this->normalizeSerial($candidate);
            if ($serial !== null) {
                return $serial;
            }
        }

        return null;
    }

    private function normalizeSerial(mixed $value): ?string
    {
        $raw = $this->stringOrNull($value);
        if ($raw === null) {
            return null;
        }

        $lower = mb_strtolower($raw);
        $junk = [
            'to be filled by o.e.m.',
            'to be filled by oem',
            'default string',
            'system serial number',
            'none',
            'n/a',
            'na',
            'unknown',
            '0',
            '00000000',
            'o.e.m.',
        ];
        if (in_array($lower, $junk, true)) {
            return null;
        }

        return mb_substr($raw, 0, 200);
    }

    private function stringOrNull(mixed $value): ?string
    {
        if ($value === null || ! is_scalar($value)) {
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
            return null;
        }

        $parts = str_split(strtoupper($hex), 2);

        return implode(':', $parts);
    }
}

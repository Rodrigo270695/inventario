<?php

namespace App\Support;

use App\Models\Office;
use App\Models\User;
use App\Models\Zonal;

final class UserGeographicAccess
{
    /**
     * @return array{0: array<int, string>|null, 1: array<int, string>|null}
     *                                                                       [allowed_office_ids, allowed_zonal_ids] — null significa sin restricción (superadmin).
     */
    public static function forUser(?User $user): array
    {
        if (! $user) {
            return [[], []];
        }

        if ($user->hasRole('superadmin', 'web')) {
            return [null, null];
        }

        $officeIdsFromPivot = $user->offices()->pluck('offices.id');

        $managedZonalIds = Zonal::query()->where('manager_id', $user->id)->pluck('id');
        $officeIdsFromManagedZonals = Office::query()
            ->whereIn('zonal_id', $managedZonalIds)
            ->pluck('id');

        $allowedOfficeIds = $officeIdsFromPivot
            ->merge($officeIdsFromManagedZonals)
            ->unique()
            ->values()
            ->all();

        $allowedZonalIds = Office::query()
            ->whereIn('id', $allowedOfficeIds)
            ->pluck('zonal_id')
            ->unique()
            ->values()
            ->all();

        return [$allowedOfficeIds, $allowedZonalIds];
    }
}

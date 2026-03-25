<?php

namespace App\Http\Middleware;

use App\Models\Zonal;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Establece en la request los zonales que el usuario puede ver:
 * - superadmin: todos (allowed_zonal_ids = null).
 * - Resto: zonales asignados vía user_zonals + zonales donde el usuario es manager_id.
 */
class FilterZonalsByUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            $request->attributes->set('allowed_zonal_ids', []);

            return $next($request);
        }

        if ($user->hasRole('superadmin', 'web')) {
            $request->attributes->set('allowed_zonal_ids', null);

            return $next($request);
        }

        $fromPivot = $user->zonals()->pluck('id');
        $fromManager = Zonal::query()->where('manager_id', $user->id)->pluck('id');
        $allowedZonalIds = $fromPivot->merge($fromManager)->unique()->values()->all();

        $request->attributes->set('allowed_zonal_ids', $allowedZonalIds);

        return $next($request);
    }
}

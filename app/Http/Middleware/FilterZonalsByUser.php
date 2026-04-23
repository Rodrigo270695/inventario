<?php

namespace App\Http\Middleware;

use App\Support\UserGeographicAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Establece en la request el alcance geográfico del usuario:
 * - superadmin: sin restricción (allowed_zonal_ids y allowed_office_ids = null).
 * - Resto:
 *   - allowed_office_ids: oficinas asignadas en user_offices + oficinas de zonales gestionados (manager_id).
 *   - allowed_zonal_ids: zonales derivados de esas oficinas (para selects de zonal y modelos anclados a zonal_id).
 */
class FilterZonalsByUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            $request->attributes->set('allowed_zonal_ids', []);
            $request->attributes->set('allowed_office_ids', []);

            return $next($request);
        }

        [$allowedOfficeIds, $allowedZonalIds] = UserGeographicAccess::forUser($user);

        $request->attributes->set('allowed_office_ids', $allowedOfficeIds);
        $request->attributes->set('allowed_zonal_ids', $allowedZonalIds);

        return $next($request);
    }
}

<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Scope global que restringe las consultas a los zonales permitidos del usuario.
 * Lee allowed_zonal_ids de la request (poblado por FilterZonalsByUser).
 * - null = superadmin, no restringe.
 * - [] = sin zonales, no devuelve filas.
 * - [uuid, ...] = solo filas cuyo zonal esté en la lista.
 *
 * El modelo debe implementar RestrictsByAllowedZonals y applyAllowedZonalsConstraint().
 */
class AllowedZonalsScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (app()->runningInConsole() && ! app()->bound('request')) {
            return;
        }

        $request = request();
        if (! $request) {
            return;
        }

        $allowedZonalIds = $request->attributes->get('allowed_zonal_ids');

        if ($allowedZonalIds === null) {
            return;
        }

        if ($allowedZonalIds === []) {
            $builder->whereRaw('1 = 0');

            return;
        }

        if (method_exists($model, 'applyAllowedZonalsConstraint')) {
            /** @var \App\Models\Concerns\RestrictsByAllowedZonals $model */
            $model->applyAllowedZonalsConstraint($builder, $allowedZonalIds);
        }
    }
}

<?php

namespace App\Models\Concerns;

use App\Models\Scopes\AllowedZonalsScope;
use Illuminate\Database\Eloquent\Builder;

/**
 * Trait para modelos cuyos registros deben restringirse por los zonales permitidos del usuario.
 * El middleware FilterZonalsByUser deja en la request allowed_zonal_ids (null = todos, [] = ninguno, [uuid,...] = lista).
 *
 * El modelo que use este trait debe implementar:
 *   applyAllowedZonalsConstraint(Builder $builder, array $allowedZonalIds): void
 * para definir cómo filtrar (zonal_id directo, whereHas por warehouse.office, etc.).
 */
trait RestrictsByAllowedZonals
{
    public static function bootRestrictsByAllowedZonals(): void
    {
        static::addGlobalScope(new AllowedZonalsScope);
    }
}

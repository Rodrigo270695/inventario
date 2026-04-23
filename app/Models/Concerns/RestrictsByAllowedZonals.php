<?php

namespace App\Models\Concerns;

use App\Models\Scopes\AllowedZonalsScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Trait para modelos cuyos registros deben restringirse por los zonales permitidos del usuario.
 * El middleware FilterZonalsByUser deja en la request:
 * - allowed_zonal_ids (null = todos, [] = ninguno, [uuid,...] = lista)
 * - allowed_office_ids (null = todos, [] = ninguno, [uuid,...] = lista)
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

    /**
     * @return array<int, string>|null
     */
    protected static function allowedOfficeIdsFromRequest(): ?array
    {
        if (! app()->bound('request')) {
            return null;
        }

        $request = request();
        if (! $request instanceof Request) {
            return null;
        }

        if (! $request->attributes->has('allowed_office_ids')) {
            return null;
        }

        /** @var array<int, string>|null $ids */
        $ids = $request->attributes->get('allowed_office_ids');

        return $ids;
    }

    /**
     * @param  array<int, string>  $allowedZonalIds
     * @param  \Closure(\Illuminate\Database\Eloquent\Builder): void  $officeScope
     * @param  \Closure(\Illuminate\Database\Eloquent\Builder): void  $zonalScope
     */
    protected static function constrainByOfficesOrZonals(
        Builder $builder,
        array $allowedZonalIds,
        \Closure $officeScope,
        \Closure $zonalScope,
    ): void {
        $officeIds = static::allowedOfficeIdsFromRequest();

        if ($officeIds !== null && $officeIds !== []) {
            $builder->where($officeScope);

            return;
        }

        $zonalScope($builder);
    }
}

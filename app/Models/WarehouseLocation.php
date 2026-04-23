<?php

namespace App\Models;

use App\Models\Concerns\RestrictsByAllowedZonals;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WarehouseLocation extends Model
{
    use HasUuids, RestrictsByAllowedZonals;

    protected $fillable = [
        'warehouse_id',
        'code',
        'aisle',
        'row',
        'bin',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function applyAllowedZonalsConstraint(Builder $builder, array $allowedZonalIds): void
    {
        static::constrainByOfficesOrZonals(
            $builder,
            $allowedZonalIds,
            fn (Builder $q) => $q->whereHas('warehouse', fn ($wq) => $wq->whereIn('office_id', static::allowedOfficeIdsFromRequest() ?? [])),
            fn (Builder $q) => $q->whereHas('warehouse.office', fn ($oq) => $oq->whereIn('zonal_id', $allowedZonalIds)),
        );
    }
}

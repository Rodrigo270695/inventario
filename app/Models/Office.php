<?php

namespace App\Models;

use App\Models\Concerns\RestrictsByAllowedZonals;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Office extends Model
{
    use HasUuids, RestrictsByAllowedZonals, SoftDeletes;

    protected $fillable = [
        'zonal_id',
        'name',
        'code',
        'address',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function zonal(): BelongsTo
    {
        return $this->belongsTo(Zonal::class);
    }

    public function warehouses(): HasMany
    {
        return $this->hasMany(Warehouse::class);
    }

    public function applyAllowedZonalsConstraint(Builder $builder, array $allowedZonalIds): void
    {
        static::constrainByOfficesOrZonals(
            $builder,
            $allowedZonalIds,
            fn (Builder $q) => $q->whereIn($this->getTable().'.id', static::allowedOfficeIdsFromRequest() ?? []),
            fn (Builder $q) => $q->whereIn($this->getTable().'.zonal_id', $allowedZonalIds),
        );
    }
}

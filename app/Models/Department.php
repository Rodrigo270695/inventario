<?php

namespace App\Models;

use App\Models\Concerns\RestrictsByAllowedZonals;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Department extends Model
{
    use HasUuids, RestrictsByAllowedZonals, SoftDeletes;

    protected $fillable = [
        'zonal_id',
        'name',
        'code',
        'parent_id',
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

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Department::class, 'parent_id');
    }

    public function applyAllowedZonalsConstraint(Builder $builder, array $allowedZonalIds): void
    {
        $builder->whereIn($this->getTable().'.zonal_id', $allowedZonalIds);
    }
}

<?php

namespace App\Models;

use App\Models\Concerns\RestrictsByAllowedZonals;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class RepairShop extends Model
{
    use HasUuids, RestrictsByAllowedZonals, SoftDeletes;

    protected $fillable = [
        'name',
        'ruc',
        'contact_name',
        'phone',
        'address',
        'zonal_id',
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

    public function repairTickets(): HasMany
    {
        return $this->hasMany(RepairTicket::class, 'repair_shop_id');
    }

    public function applyAllowedZonalsConstraint(Builder $builder, array $allowedZonalIds): void
    {
        $builder->whereIn($this->getTable().'.zonal_id', $allowedZonalIds);
    }
}

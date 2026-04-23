<?php

namespace App\Models;

use App\Models\Concerns\RestrictsByAllowedZonals;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class RepairTicket extends Model
{
    use HasUuids, RestrictsByAllowedZonals, SoftDeletes;

    protected $fillable = [
        'code',
        'asset_id',
        'component_id',
        'warehouse_id',
        'status',
        'priority',
        'failure_type',
        'maintenance_mode',
        'estimated_cost',
        'approved_budget',
        'reported_at',
        'diagnosed_at',
        'started_at',
        'completed_at',
        'approved_at',
        'rejected_at',
        'cancelled_at',
        'issue_description',
        'diagnosis',
        'solution',
        'condition_in',
        'condition_out',
        'opened_by',
        'technician_id',
        'approved_by',
        'rejected_by',
        'cancelled_by',
        'repair_shop_id',
        'external_reference',
        'rejection_reason',
        'cancellation_reason',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'estimated_cost' => 'decimal:2',
            'approved_budget' => 'decimal:2',
            'reported_at' => 'datetime',
            'diagnosed_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(Component::class, 'component_id');
    }

    public function openedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejectedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function cancelledByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function repairShop(): BelongsTo
    {
        return $this->belongsTo(RepairShop::class, 'repair_shop_id');
    }

    public function parts(): HasMany
    {
        return $this->hasMany(RepairPart::class, 'repair_ticket_id');
    }

    public function costs(): HasMany
    {
        return $this->hasMany(RepairCost::class, 'repair_ticket_id');
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(MaintenanceStatusLog::class, 'repair_ticket_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(MaintenanceDocument::class, 'repair_ticket_id');
    }

    public function applyAllowedZonalsConstraint(Builder $builder, array $allowedZonalIds): void
    {
        $officeIds = static::allowedOfficeIdsFromRequest();

        if ($officeIds !== null && $officeIds !== []) {
            $builder->where(function (Builder $query) use ($officeIds, $allowedZonalIds) {
                $query
                    ->whereHas('warehouse', fn ($wq) => $wq->whereIn('office_id', $officeIds))
                    ->orWhereHas('asset.warehouse', fn ($wq) => $wq->whereIn('office_id', $officeIds))
                    ->orWhereHas('component.warehouse', fn ($wq) => $wq->whereIn('office_id', $officeIds))
                    ->orWhereHas('repairShop', fn ($shopQuery) => $shopQuery->whereIn('zonal_id', $allowedZonalIds));
            });

            return;
        }

        $builder->where(function (Builder $query) use ($allowedZonalIds) {
            $query
                ->whereHas('warehouse.office', fn ($officeQuery) => $officeQuery->whereIn('zonal_id', $allowedZonalIds))
                ->orWhereHas('asset.warehouse.office', fn ($officeQuery) => $officeQuery->whereIn('zonal_id', $allowedZonalIds))
                ->orWhereHas('component.warehouse.office', fn ($officeQuery) => $officeQuery->whereIn('zonal_id', $allowedZonalIds))
                ->orWhereHas('repairShop', fn ($shopQuery) => $shopQuery->whereIn('zonal_id', $allowedZonalIds));
        });
    }
}

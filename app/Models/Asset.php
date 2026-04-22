<?php

namespace App\Models;

use App\Models\Concerns\RestrictsByAllowedZonals;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Asset extends Model
{
    use HasUuids;
    use RestrictsByAllowedZonals;
    use SoftDeletes;

    protected $fillable = [
        'code',
        'serial_number',
        'model_id',
        'brand_id',
        'category_id',
        'purchase_item_id',
        'status',
        'condition',
        'warehouse_id',
        'repair_shop_id',
        'acquisition_value',
        'acquisition_date',
        'current_value',
        'depreciation_rate',
        'warranty_until',
        'specs',
        'notes',
        'registered_by_id',
        'updated_by_id',
    ];

    protected function casts(): array
    {
        return [
            'acquisition_value' => 'decimal:2',
            'acquisition_date' => 'date',
            'current_value' => 'decimal:2',
            'depreciation_rate' => 'decimal:2',
            'warranty_until' => 'date',
            'specs' => 'array',
        ];
    }

    public function model(): BelongsTo
    {
        return $this->belongsTo(AssetModel::class, 'model_id');
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(AssetBrand::class, 'brand_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(AssetCategory::class, 'category_id');
    }

    public function purchaseItem(): BelongsTo
    {
        return $this->belongsTo(PurchaseItem::class, 'purchase_item_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function repairShop(): BelongsTo
    {
        return $this->belongsTo(RepairShop::class, 'repair_shop_id');
    }

    public function registeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_id');
    }

    public function computer(): HasOne
    {
        return $this->hasOne(AssetComputer::class, 'asset_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(AssetAssignment::class, 'asset_id');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(AssetPhoto::class, 'asset_id');
    }

    public function repairTickets(): HasMany
    {
        return $this->hasMany(RepairTicket::class, 'asset_id');
    }

    public function preventiveTasks(): HasMany
    {
        return $this->hasMany(PreventiveTask::class, 'asset_id');
    }

    public function disposals(): HasMany
    {
        return $this->hasMany(AssetDisposal::class, 'asset_id');
    }

    public function licenseAssignments(): HasMany
    {
        return $this->hasMany(LicenseAssignment::class, 'asset_id');
    }

    public function softwareInstallations(): HasMany
    {
        return $this->hasMany(SoftwareInstallation::class, 'asset_id');
    }

    public function agentReports(): HasMany
    {
        return $this->hasMany(AgentReport::class, 'asset_id');
    }

    public function applyAllowedZonalsConstraint(Builder $builder, array $allowedZonalIds): void
    {
        $builder->where(function ($q) use ($allowedZonalIds) {
            $q->whereNull('warehouse_id')
                ->orWhereHas('warehouse.office', fn ($oq) => $oq->whereIn('zonal_id', $allowedZonalIds));
        });
    }
}

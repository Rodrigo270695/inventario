<?php

namespace App\Models;

use App\Models\Concerns\RestrictsByAllowedZonals;
use App\Models\TransferItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetTransfer extends Model
{
    use HasUuids, RestrictsByAllowedZonals;

    protected $fillable = [
        'code',
        'origin_warehouse_id',
        'destination_warehouse_id',
        'status',
        'sent_by',
        'received_by',
        'approved_by',
        'approved_at',
        'carrier_name',
        'tracking_number',
        'carrier_reference',
        'company_guide_number',
        'company_guide_path',
        'carrier_voucher_number',
        'carrier_voucher_path',
        'ship_date',
        'received_at',
        'dispatch_notes',
        'receipt_notes',
        'cancelled_by',
        'cancelled_at',
        'cancellation_reason',
    ];

    protected function casts(): array
    {
        return [
            'approved_at' => 'datetime',
            'ship_date' => 'datetime',
            'received_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function originWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'origin_warehouse_id');
    }

    public function destinationWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'destination_warehouse_id');
    }

    public function sentByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }

    public function receivedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function cancelledByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(TransferItem::class, 'asset_transfer_id');
    }

    public function applyAllowedZonalsConstraint(Builder $builder, array $allowedZonalIds): void
    {
        $builder->where(function ($query) use ($allowedZonalIds) {
            $query
                ->whereHas('originWarehouse.office', fn ($officeQuery) => $officeQuery->whereIn('zonal_id', $allowedZonalIds))
                ->orWhereHas('destinationWarehouse.office', fn ($officeQuery) => $officeQuery->whereIn('zonal_id', $allowedZonalIds));
        });
    }
}

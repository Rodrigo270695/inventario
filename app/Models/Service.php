<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Service extends Model
{
    use HasUuids;

    protected $fillable = [
        'purchase_item_id',
        'supplier_id',
        'asset_subcategory_id',
        'warehouse_id',
        'name',
        'type',
        'requested_by',
        'start_date',
        'end_date',
        'renewal',
        'amount',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'amount' => 'decimal:2',
        ];
    }

    public function purchaseItem(): BelongsTo
    {
        return $this->belongsTo(PurchaseItem::class);
    }

    public function assetSubcategory(): BelongsTo
    {
        return $this->belongsTo(AssetSubcategory::class, 'asset_subcategory_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function requestedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    /** OC en cascada: $service->purchaseItem->purchaseOrder */
    public function getPurchaseOrderAttribute(): ?PurchaseOrder
    {
        return $this->purchaseItem?->purchaseOrder;
    }

    /** Proveedor en cascada: $service->purchaseItem->purchaseOrder->supplier */
    public function getSupplierAttribute(): ?Supplier
    {
        return $this->purchaseOrder?->supplier;
    }
}

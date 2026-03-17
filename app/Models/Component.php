<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Component extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $fillable = [
        'code',
        'serial_number',
        'type_id',
        'brand_id',
        'subcategory_id',
        'model',
        'warehouse_id',
        'repair_shop_id',
        'status',
        'condition',
        'purchase_item_id',
        'specs',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'specs' => 'array',
        ];
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(ComponentType::class, 'type_id');
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(AssetBrand::class, 'brand_id');
    }

    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(AssetSubcategory::class, 'subcategory_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function repairShop(): BelongsTo
    {
        return $this->belongsTo(RepairShop::class, 'repair_shop_id');
    }

    public function purchaseItem(): BelongsTo
    {
        return $this->belongsTo(PurchaseItem::class, 'purchase_item_id');
    }

    public function computerComponents(): HasMany
    {
        return $this->hasMany(ComputerComponent::class, 'component_id');
    }

    public function repairTickets(): HasMany
    {
        return $this->hasMany(RepairTicket::class, 'component_id');
    }

    public function preventiveTasks(): HasMany
    {
        return $this->hasMany(PreventiveTask::class, 'component_id');
    }

    public function disposals(): HasMany
    {
        return $this->hasMany(AssetDisposal::class, 'component_id');
    }
}


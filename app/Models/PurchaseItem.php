<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Models\AssetCategory;

class PurchaseItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'purchase_order_id',
        'description',
        'quantity',
        'unit_price',
        'total_price',
        'asset_category_id',
        'asset_subcategory_id',
        'asset_brand_id',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'decimal:2',
            'total_price' => 'decimal:2',
        ];
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function assetCategory(): BelongsTo
    {
        return $this->belongsTo(AssetCategory::class, 'asset_category_id');
    }

    public function assetSubcategory(): BelongsTo
    {
        return $this->belongsTo(AssetSubcategory::class, 'asset_subcategory_id');
    }

    public function assetBrand(): BelongsTo
    {
        return $this->belongsTo(AssetBrand::class, 'asset_brand_id');
    }

    public function service(): HasOne
    {
        return $this->hasOne(Service::class);
    }
}

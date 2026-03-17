<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockEntryItem extends Model
{
    protected $fillable = [
        'stock_entry_id',
        'purchase_item_id',
        'asset_id',
        'component_id',
        'condition',
        'quantity',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
        ];
    }

    public function stockEntry(): BelongsTo
    {
        return $this->belongsTo(StockEntry::class);
    }

    public function purchaseItem(): BelongsTo
    {
        return $this->belongsTo(PurchaseItem::class);
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(Component::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryCountItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'inventory_count_id',
        'asset_id',
        'component_id',
        'expected_quantity',
        'counted_quantity',
        'difference',
        'condition_at_count',
        'notes',
    ];

    protected function casts(): array
    {
        return [];
    }

    public function count(): BelongsTo
    {
        return $this->belongsTo(InventoryCount::class, 'inventory_count_id');
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


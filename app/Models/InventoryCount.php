<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryCount extends Model
{
    use HasUuids;

    protected $fillable = [
        'warehouse_id',
        'count_date',
        'status',
        'reconciled_at',
        'reconciled_by',
    ];

    protected function casts(): array
    {
        return [
            'count_date' => 'date',
            'reconciled_at' => 'datetime',
        ];
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function reconciledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reconciled_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InventoryCountItem::class);
    }
}


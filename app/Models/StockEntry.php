<?php

namespace App\Models;

use App\Models\Concerns\RestrictsByAllowedZonals;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockEntry extends Model
{
    use HasUuids, RestrictsByAllowedZonals;

    protected $fillable = [
        'invoice_id',
        'warehouse_id',
        'entry_date',
        'status',
        'received_by',
        'registered_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'entry_date' => 'date',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function receivedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function registeredByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockEntryItem::class, 'stock_entry_id');
    }

    public function applyAllowedZonalsConstraint(Builder $builder, array $allowedZonalIds): void
    {
        $builder->whereHas('warehouse.office', fn ($q) => $q->whereIn('zonal_id', $allowedZonalIds));
    }
}

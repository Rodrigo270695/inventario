<?php

namespace App\Models;

use App\Models\Concerns\RestrictsByAllowedZonals;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    use HasUuids, RestrictsByAllowedZonals;

    protected $fillable = [
        'supplier_id',
        'code',
        'status',
        'requested_by',
        'approved_by',
        'approved_at',
        'rejected_by',
        'rejected_at',
        'observed_by',
        'observed_at',
        'observation_notes',
        'total_amount',
        'office_id',
        'selected_quote_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'observed_at' => 'datetime',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class);
    }

    public function requestedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejectedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function observedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'observed_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseItem::class, 'purchase_order_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'purchase_order_id');
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(PurchaseQuote::class, 'purchase_order_id');
    }

    public function applyAllowedZonalsConstraint(Builder $builder, array $allowedZonalIds): void
    {
        $builder->whereHas('office', fn ($q) => $q->whereIn('zonal_id', $allowedZonalIds));
    }
}

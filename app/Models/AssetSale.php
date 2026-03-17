<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetSale extends Model
{
    use HasUuids;

    protected $fillable = [
        'asset_disposal_id',
        'buyer_name',
        'buyer_dni',
        'amount',
        'payment_method',
        'sold_at',
        'status',
        'approved_by',
        'approved_at',
        'created_by',
        'notes',
        'approval_notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'sold_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    public function disposal(): BelongsTo
    {
        return $this->belongsTo(AssetDisposal::class, 'asset_disposal_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}


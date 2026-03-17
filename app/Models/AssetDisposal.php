<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class AssetDisposal extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $fillable = [
        'asset_id',
        'component_id',
        'warehouse_id',
        'status',
        'reason',
        'approved_by',
        'approved_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'approved_at' => 'datetime',
        ];
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(Component::class, 'component_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function sale(): HasOne
    {
        return $this->hasOne(AssetSale::class, 'asset_disposal_id');
    }
}


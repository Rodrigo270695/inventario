<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferItem extends Model
{
    protected $fillable = [
        'asset_transfer_id',
        'asset_id',
        'component_id',
        'condition_out',
        'condition_in',
    ];

    public function assetTransfer(): BelongsTo
    {
        return $this->belongsTo(AssetTransfer::class, 'asset_transfer_id');
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(Component::class, 'component_id');
    }
}

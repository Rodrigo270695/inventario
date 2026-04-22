<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SoftwareInstallation extends Model
{
    use HasUuids;

    protected $fillable = [
        'asset_id',
        'product_id',
        'version',
        'detected_at',
        'is_authorized',
    ];

    protected function casts(): array
    {
        return [
            'detected_at' => 'datetime',
            'is_authorized' => 'boolean',
        ];
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(SoftwareProduct::class, 'product_id');
    }
}

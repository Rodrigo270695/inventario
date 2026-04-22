<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentReport extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'asset_id',
        'payload',
        'reported_at',
        'is_full_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'reported_at' => 'datetime',
            'is_full_snapshot' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }
}

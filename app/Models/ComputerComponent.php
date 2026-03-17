<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComputerComponent extends Model
{
    protected $fillable = [
        'asset_id',
        'component_id',
        'slot',
        'installed_at',
        'uninstalled_at',
        'installed_by',
        'uninstalled_by',
    ];

    protected function casts(): array
    {
        return [
            'installed_at' => 'datetime',
            'uninstalled_at' => 'datetime',
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

    public function installedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'installed_by');
    }

    public function uninstalledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uninstalled_by');
    }
}


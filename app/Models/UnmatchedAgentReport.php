<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class UnmatchedAgentReport extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'payload',
        'bios_serial',
        'mac_address',
        'hostname',
        'reason',
        'candidate_count',
        'candidate_asset_ids',
        'reported_at',
        'is_full_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'candidate_asset_ids' => 'array',
            'reported_at' => 'datetime',
            'is_full_snapshot' => 'boolean',
            'created_at' => 'datetime',
        ];
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class BackupLog extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'type',
        'status',
        'started_at',
        'completed_at',
        'verified_at',
        'path_or_ref',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'verified_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }
}

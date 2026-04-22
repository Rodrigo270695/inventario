<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiKeyLog extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'token_id',
        'endpoint',
        'ip_address',
        'status_code',
    ];

    protected function casts(): array
    {
        return [
            'status_code' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function token(): BelongsTo
    {
        return $this->belongsTo(AgentToken::class, 'token_id');
    }
}

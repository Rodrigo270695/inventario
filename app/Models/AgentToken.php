<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AgentToken extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'token_hash',
        'ip_whitelist',
        'expires_at',
        'last_used_at',
    ];

    protected function casts(): array
    {
        return [
            'ip_whitelist' => 'array',
            'expires_at' => 'datetime',
            'last_used_at' => 'datetime',
        ];
    }

    /**
     * @param  array<int, string>|null  $ips
     */
    public function ipAllowed(?string $ip): bool
    {
        $list = $this->ip_whitelist;
        if ($list === null || $list === []) {
            return true;
        }
        if ($ip === null || $ip === '') {
            return false;
        }

        return in_array($ip, $list, true);
    }

    public function isExpired(): bool
    {
        if ($this->expires_at === null) {
            return false;
        }

        return $this->expires_at->isPast();
    }

    public function apiKeyLogs(): HasMany
    {
        return $this->hasMany(ApiKeyLog::class, 'token_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GlAccount extends Model
{
    use HasUuids;

    protected $table = 'gl_accounts';

    protected $fillable = [
        'code',
        'name',
        'account_type',
        'parent_id',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(GlAccount::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(GlAccount::class, 'parent_id');
    }
}

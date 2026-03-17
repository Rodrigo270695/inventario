<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DepreciationEntry extends Model
{
    use HasFactory;
    use HasUuids;

    protected $table = 'depreciation_entries';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'asset_id',
        'period',
        'method',
        'amount',
        'book_value_before',
        'book_value_after',
        'calculated_at',
        'approved_by',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'book_value_before' => 'decimal:2',
            'book_value_after' => 'decimal:2',
            'calculated_at' => 'datetime',
        ];
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}


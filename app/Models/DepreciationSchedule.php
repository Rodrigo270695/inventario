<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DepreciationSchedule extends Model
{
    use HasFactory;
    use HasUuids;

    protected $table = 'depreciation_schedules';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'category_id',
        'method',
        'useful_life_years',
        'residual_value_pct',
    ];

    protected function casts(): array
    {
        return [
            'useful_life_years' => 'integer',
            'residual_value_pct' => 'decimal:2',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(AssetCategory::class, 'category_id');
    }

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class, 'category_id', 'category_id');
    }
}


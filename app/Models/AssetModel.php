<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AssetModel extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'brand_id',
        'subcategory_id',
        'name',
        'specs',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'specs' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(AssetBrand::class, 'brand_id');
    }

    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(AssetSubcategory::class, 'subcategory_id');
    }
}

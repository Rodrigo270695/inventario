<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetSubcategory extends Model
{
    use HasUuids;

    protected $table = 'asset_subcategories';

    protected $fillable = [
        'asset_category_id',
        'name',
        'code',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function assetCategory(): BelongsTo
    {
        return $this->belongsTo(AssetCategory::class, 'asset_category_id');
    }

    /** Alias para compatibilidad con eager loading (ej. model.subcategory.category). */
    public function category(): BelongsTo
    {
        return $this->belongsTo(AssetCategory::class, 'asset_category_id');
    }

    public function assetModels(): HasMany
    {
        return $this->hasMany(AssetModel::class, 'subcategory_id');
    }
}

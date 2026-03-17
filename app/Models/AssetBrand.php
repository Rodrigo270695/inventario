<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetBrand extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
    ];

    public function assetModels(): HasMany
    {
        return $this->hasMany(AssetModel::class, 'brand_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SoftwareProduct extends Model
{
    use HasUuids;

    protected $fillable = [
        'vendor_id',
        'name',
        'is_tracked',
    ];

    protected function casts(): array
    {
        return [
            'is_tracked' => 'boolean',
        ];
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(SoftwareVendor::class, 'vendor_id');
    }

    public function licenses(): HasMany
    {
        return $this->hasMany(SoftwareLicense::class, 'product_id');
    }

    public function installations(): HasMany
    {
        return $this->hasMany(SoftwareInstallation::class, 'product_id');
    }
}

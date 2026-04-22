<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SoftwareLicense extends Model
{
    use HasUuids;

    protected $fillable = [
        'product_id',
        'license_type',
        'seats_total',
        'seats_used',
        'valid_until',
        'cost',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'seats_total' => 'integer',
            'seats_used' => 'integer',
            'valid_until' => 'date',
            'cost' => 'decimal:2',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(SoftwareProduct::class, 'product_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(LicenseAssignment::class, 'software_license_id');
    }
}

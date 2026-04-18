<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Categorías tributarias SUNAT (asset_categories): technology, vehicle, furniture,
 * building, machinery, other. Vida útil, método depreciación y cuentas contables vía gl_accounts.
 */
class AssetCategory extends Model
{
    use HasUuids;

    protected $table = 'asset_categories';

    protected $fillable = [
        'name',
        'code',
        'type',
        'gl_account_id',
        'gl_depreciation_account_id',
        'default_useful_life_years',
        'default_depreciation_method',
        'default_residual_value_pct',
        'requires_insurance',
        'requires_soat',
        'icon',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'default_useful_life_years' => 'integer',
            'default_residual_value_pct' => 'decimal:2',
            'requires_insurance' => 'boolean',
            'requires_soat' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function glAccount(): BelongsTo
    {
        return $this->belongsTo(GlAccount::class, 'gl_account_id');
    }

    public function glDepreciationAccount(): BelongsTo
    {
        return $this->belongsTo(GlAccount::class, 'gl_depreciation_account_id');
    }

    public function subcategories(): HasMany
    {
        return $this->hasMany(AssetSubcategory::class, 'asset_category_id');
    }

    public function purchaseItems(): HasMany
    {
        return $this->hasMany(PurchaseItem::class, 'asset_category_id');
    }

    /** Categoría «A» — activo fijo (formularios de activos). */
    public function scopeForFixedAssetForms(Builder $query): Builder
    {
        return $query->where('type', 'fixed_asset');
    }

    /** Categoría «B» — activo menor / complementos (formularios de componentes). */
    public function scopeForMinorAssetForms(Builder $query): Builder
    {
        return $query->where('type', 'minor_asset');
    }

    /**
     * Categoría «C» — servicios y mantenimiento (formularios de servicios).
     * Incluye `service_maintenance` y, en ERP, filas «CATEGORÍA C» con tipo tributario `other`
     * y código CAT-S… (p. ej. mant. muebles CAT-SEN).
     */
    public function scopeForServiceMaintenanceForms(Builder $query): Builder
    {
        return $query->where(function (Builder $q): void {
            $q->where('type', 'service_maintenance')
                ->orWhere(function (Builder $q2): void {
                    $q2->where('type', 'other')
                        ->whereRaw('UPPER(code) LIKE ?', ['CAT-S%']);
                });
        });
    }
}

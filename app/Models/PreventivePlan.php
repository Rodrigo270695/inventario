<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PreventivePlan extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'target_type',
        'subcategory_id',
        'component_type_id',
        'warehouse_id',
        'frequency_type',
        'frequency_days',
        'checklist',
        'default_priority',
        'estimated_cost',
        'assigned_role',
        'is_active',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'checklist' => 'array',
            'estimated_cost' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(AssetSubcategory::class, 'subcategory_id');
    }

    public function componentType(): BelongsTo
    {
        return $this->belongsTo(ComponentType::class, 'component_type_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(PreventiveTask::class, 'plan_id');
    }
}

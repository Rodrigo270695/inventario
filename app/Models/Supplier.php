<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'name',
        'ruc',
        'contact_name',
        'contact_email',
        'contact_phone',
        'address',
        'payment_conditions',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    public function repairCosts(): HasMany
    {
        return $this->hasMany(RepairCost::class, 'supplier_id');
    }
}

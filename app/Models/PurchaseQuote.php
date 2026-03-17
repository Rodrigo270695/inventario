<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseQuote extends Model
{
    use HasUuids;

    protected $fillable = [
        'purchase_order_id',
        'pdf_path',
        'description',
        'is_selected',
    ];

    protected function casts(): array
    {
        return [
            'is_selected' => 'boolean',
        ];
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }
}


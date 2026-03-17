<?php

namespace App\Models;

use App\Models\Concerns\RestrictsByAllowedZonals;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Invoice extends Model
{
    use HasUuids, RestrictsByAllowedZonals;

    protected $fillable = [
        'purchase_order_id',
        'invoice_number',
        'invoice_date',
        'pdf_path',
        'amount',
        'remission_guide',
        'remission_guide_path',
        'status',
        'registered_by_id',
        'updated_by_id',
        'closed_by_id',
        'opened_by_id',
    ];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
            'amount' => 'decimal:2',
        ];
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function registeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_id');
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by_id');
    }

    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by_id');
    }

    public function applyAllowedZonalsConstraint(Builder $builder, array $allowedZonalIds): void
    {
        $builder->whereHas('purchaseOrder.office', fn ($q) => $q->whereIn('zonal_id', $allowedZonalIds));
    }

    protected static function booted(): void
    {
        static::deleting(function (Invoice $invoice) {
            if ($invoice->pdf_path && Storage::disk('local')->exists($invoice->pdf_path)) {
                Storage::disk('local')->delete($invoice->pdf_path);
            }
            if ($invoice->remission_guide_path && Storage::disk('local')->exists($invoice->remission_guide_path)) {
                Storage::disk('local')->delete($invoice->remission_guide_path);
            }
        });
    }
}

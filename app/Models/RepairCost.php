<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RepairCost extends Model
{
    use HasUuids;

    protected $fillable = [
        'repair_ticket_id',
        'type',
        'amount',
        'supplier_id',
        'document_type',
        'document_number',
        'document_path',
        'description',
        'incurred_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'incurred_at' => 'datetime',
        ];
    }

    public function repairTicket(): BelongsTo
    {
        return $this->belongsTo(RepairTicket::class, 'repair_ticket_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(MaintenanceDocument::class, 'repair_cost_id');
    }
}

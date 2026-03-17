<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RepairPart extends Model
{
    use HasUuids;

    protected $fillable = [
        'repair_ticket_id',
        'component_id',
        'part_name',
        'part_number',
        'source_type',
        'quantity',
        'unit_cost',
        'total_cost',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'unit_cost' => 'decimal:2',
            'total_cost' => 'decimal:2',
        ];
    }

    public function repairTicket(): BelongsTo
    {
        return $this->belongsTo(RepairTicket::class, 'repair_ticket_id');
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(Component::class, 'component_id');
    }
}

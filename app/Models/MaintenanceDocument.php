<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceDocument extends Model
{
    use HasUuids;

    protected $fillable = [
        'repair_ticket_id',
        'preventive_task_id',
        'repair_cost_id',
        'type',
        'issuer_type',
        'document_number',
        'title',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
        'issued_at',
        'uploaded_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
        ];
    }

    public function repairTicket(): BelongsTo
    {
        return $this->belongsTo(RepairTicket::class, 'repair_ticket_id');
    }

    public function preventiveTask(): BelongsTo
    {
        return $this->belongsTo(PreventiveTask::class, 'preventive_task_id');
    }

    public function repairCost(): BelongsTo
    {
        return $this->belongsTo(RepairCost::class, 'repair_cost_id');
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

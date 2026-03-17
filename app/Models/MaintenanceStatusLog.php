<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceStatusLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'repair_ticket_id',
        'preventive_task_id',
        'event_type',
        'from_status',
        'to_status',
        'comment',
        'performed_by',
    ];

    public function repairTicket(): BelongsTo
    {
        return $this->belongsTo(RepairTicket::class, 'repair_ticket_id');
    }

    public function preventiveTask(): BelongsTo
    {
        return $this->belongsTo(PreventiveTask::class, 'preventive_task_id');
    }

    public function performedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}

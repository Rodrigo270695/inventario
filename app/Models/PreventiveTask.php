<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PreventiveTask extends Model
{
    use HasUuids;

    protected $fillable = [
        'plan_id',
        'asset_id',
        'component_id',
        'status',
        'priority',
        'scheduled_date',
        'started_at',
        'completed_at',
        'technician_id',
        'findings',
        'action_taken',
        'checklist_done',
        'condition_after',
        'cost',
        'next_due_date',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_date' => 'date',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'checklist_done' => 'array',
            'cost' => 'decimal:2',
            'next_due_date' => 'date',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(PreventivePlan::class, 'plan_id');
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(Component::class, 'component_id');
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(MaintenanceStatusLog::class, 'preventive_task_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(MaintenanceDocument::class, 'preventive_task_id');
    }
}

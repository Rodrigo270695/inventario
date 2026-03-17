<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AlertEvent extends Model
{
    use HasFactory;
    use HasUuids;

    protected $table = 'alert_events';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'alert_rule_id',
        'severity',
        'model_type',
        'model_id',
        'payload',
        'resolved_at',
        'resolved_by',
    ];

    protected $casts = [
        'payload' => 'array',
        'resolved_at' => 'datetime',
    ];

    public function rule(): BelongsTo
    {
        return $this->belongsTo(AlertRule::class, 'alert_rule_id');
    }

    public function model(): MorphTo
    {
        return $this->morphTo(null, 'model_type', 'model_id');
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}


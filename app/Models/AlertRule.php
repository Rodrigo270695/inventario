<?php

namespace App\Models;

use App\Models\AlertEvent;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AlertRule extends Model
{
    use HasFactory;
    use HasUuids;

    protected $table = 'alert_rules';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'name',
        'type',
        'channels',
        'notify_roles',
        'threshold_config',
        'is_active',
    ];

    protected $casts = [
        'channels' => 'array',
        'notify_roles' => 'array',
        'threshold_config' => 'array',
        'is_active' => 'boolean',
    ];

    public function events(): HasMany
    {
        return $this->hasMany(AlertEvent::class, 'alert_rule_id');
    }
}


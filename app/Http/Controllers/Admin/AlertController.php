<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AlertEvent;
use App\Models\AlertRule;
use App\Models\Notification;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AlertController extends Controller
{
    public function index(Request $request): Response
    {
        $rules = AlertRule::query()
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'channels', 'notify_roles', 'threshold_config', 'is_active', 'created_at']);

        $events = AlertEvent::query()
            ->with('rule:id,name,type')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get([
                'id',
                'alert_rule_id',
                'severity',
                'model_type',
                'model_id',
                'payload',
                'resolved_at',
                'resolved_by',
                'created_at',
            ]);

        $notifications = Notification::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get(['id', 'type', 'data', 'read_at', 'created_at']);

        return Inertia::render('admin/alerts/index', [
            'rules' => $rules,
            'events' => $events,
            'notifications' => $notifications,
        ]);
    }
}

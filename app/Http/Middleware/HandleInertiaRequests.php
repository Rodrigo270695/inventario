<?php

namespace App\Http\Middleware;

use App\Models\StockEntry;
use App\Models\Notification;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $permissions = $user
            ? $user->getAllPermissions()->pluck('name')->values()->all()
            : [];

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                'permissions' => $permissions,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'toast' => $request->session()->get('toast'),
                'restore_candidate' => $request->session()->get('restore_candidate'),
                'restore_payload' => $request->session()->get('restore_payload'),
                'restore_user' => $request->session()->get('restore_user'),
            ],
            'stockEntriesPendingConfirmCount' => 0,
            'notificationsUnreadCount' => in_array('alerts.view', $permissions, true)
                ? Notification::query()
                    ->whereNull('read_at')
                    ->count()
                : 0,
        ];
    }
}
